const axios = require('axios');

// Ollama API endpoint (runs locally) - use 127.0.0.1 instead of localhost to force IPv4
const OLLAMA_URL = 'http://127.0.0.1:11434';
const MODEL_NAME = 'llama3.2:1b'; // Using 1b model (smaller, fits in GPU memory)

// Force CPU-only mode to avoid GPU memory issues
const OLLAMA_OPTIONS = {
  num_gpu: 0,        // Use CPU only (prevents "model requires more system memory" error)
  num_thread: 4,     // Use 4 CPU threads for decent performance
  num_ctx: 2048,     // Context window
};

/**
 * Check if Ollama is running locally
 */
async function isOllamaAvailable() {
  try {
    const response = await axios.get(`${OLLAMA_URL}/api/tags`, { 
      timeout: 5000,
      validateStatus: () => true // Accept any status
    });
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

/**
 * Get list of available models in Ollama
 */
async function getAvailableModels() {
  try {
    const response = await axios.get(`${OLLAMA_URL}/api/tags`);
    return response.data.models || [];
  } catch (error) {
    console.error('Failed to get Ollama models:', error.message);
    return [];
  }
}

/**
 * Use Ollama to extract eligible courses from text
 * @param {string} pageText - The raw text from the scholarship page
 * @param {string} url - The scholarship URL for context
 * @returns {Promise<string[]|null>} - Array of course names or null
 */
async function extractCoursesWithOllama(pageText, url) {
  try {
    // Check if Ollama is running
    if (!await isOllamaAvailable()) {
      return null;
    }

    // Limit text to avoid token limits but keep enough context
    const truncatedText = pageText.slice(0, 4000);

    const prompt = `You are an expert scholarship data analyst. Your task is to carefully read this scholarship webpage and extract ONLY the eligible/preferred courses, fields of study, or academic programs.

📋 EXTRACTION GUIDELINES:

✅ EXTRACT these as courses/fields:
- Academic programs: "Computer Science", "Engineering", "Medicine", "Business Administration"
- Study fields: "Information Technology", "Accounting", "Law", "Psychology"
- Engineering specializations: "Civil Engineering", "Mechanical Engineering", "Electrical Engineering"
- Sub-disciplines: "Quantity Surveying", "Building Management", "Highway Engineering"
- Specific majors: "Software Engineering", "Nursing", "Architecture"
- Broad categories: "STEM Fields", "Social Sciences", "Arts & Humanities"
- Degree names: "Bachelor of Science", "Bachelor of Engineering"

❌ DO NOT EXTRACT these:
- Grade requirements: "STPM - 3As", "A-Level: AAA", "SPM: 5As", "UEC - 8A*", "minimum 5A's"
- Qualification levels: "STPM", "SPM", "A-Level", "O-Level", "Matriculation", "Foundation"
- General eligibility: "Malaysian citizens", "Age 18-25", "aged 23 and below", "B40 families"
- Requirements: "minimum CGPA", "full-time undergraduate", "Ministry of Higher Education"
- Navigation items: "Home", "About Us", "Contact", "Apply Now", "Read more"
- Generic words: "All", "Any", "Other", "Various"

📖 HOW TO READ THE PAGE:

1. **Priority sections** - Look for these first:
   - "Preferred Discipline" (very important!)
   - "Eligible Courses"
   - "Fields of Study"
   - "Program"
   - "Course Offerings"
   
2. Check bullet points and lists under eligibility criteria

3. Read paragraphs mentioning "pursuing", "studying", "enrolled in", "helps students in fields like"

4. Extract ALL specific programs/disciplines mentioned, including sub-specializations

5. If it says "open to all courses/fields/programs", return: ["All Fields"]

🎯 SPECIAL CASES:
- If ONLY grade requirements are listed (no courses mentioned), return: ["All Fields"]
- If text says "any course/field/program/discipline", return: ["All Fields"]  
- If you cannot find ANY course information, return: null
- Extract BOTH main field AND specializations (e.g., "Civil Engineering", "Mechanical Engineering")
- Include sub-disciplines like "Quantity Surveying", "Building Management"

📄 SCHOLARSHIP PAGE TEXT:
${truncatedText}

🌐 URL: ${url}

TASK: Extract eligible courses/fields as a clean JSON array. Maximum 20 items.

⚠️ IMPORTANT: Return ONLY a flat JSON array, NOT a structured object! Combine all courses from different sections into ONE array.

RESPONSE FORMAT (simple flat JSON array only, no explanation, no object keys):
["Course 1", "Course 2", "Course 3"]

CORRECT ✅:
["Civil Engineering", "Mechanical Engineering", "Electrical Engineering", "Quantity Surveying", "Building Management"]

INCORRECT ❌:
{"Preferred Discipline": ["Civil Engineering"], "Fields": ["Computer Science"]}

Your response:`;

    // Create a timeout promise that will reject after 45 seconds
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Ollama request timed out after 45 seconds')), 45000);
    });

    // Race between the Ollama call and the timeout
    const response = await Promise.race([
      axios.post(`${OLLAMA_URL}/api/generate`, {
        model: MODEL_NAME,
        prompt: prompt,
        stream: false,
        options: {
          ...OLLAMA_OPTIONS, // Use CPU-only settings
          temperature: 0.2, // Slightly more creative for better interpretation
          top_p: 0.9,
          num_predict: 1200, // Increased from 800 to allow complete flat array response
        }
      }, {
        timeout: 60000, // 60 second timeout (secondary)
        headers: {
          'Content-Type': 'application/json'
        }
      }),
      timeoutPromise
    ]);

    const responseText = response.data.response.trim();

    // Try to parse the JSON response
    let courses;
    try {
      // Remove markdown code blocks if present
      const jsonText = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      courses = JSON.parse(jsonText);
    } catch (parseError) {
      // Try to find JSON object or array in the response
      const objectMatch = responseText.match(/\{[\s\S]*?\}/);
      const arrayMatch = responseText.match(/\[[\s\S]*?\]/);
      
      if (objectMatch) {
        try {
          courses = JSON.parse(objectMatch[0]);
        } catch (e) {
          if (arrayMatch) {
            try {
              courses = JSON.parse(arrayMatch[0]);
            } catch (e2) {
              return null;
            }
          } else {
            return null;
          }
        }
      } else if (arrayMatch) {
        try {
          courses = JSON.parse(arrayMatch[0]);
        } catch (e) {
          return null;
        }
      } else {
        return null;
      }
    }

    // Validate response
    if (!Array.isArray(courses)) {
      // Try to handle structured object responses
      if (typeof courses === 'object' && courses !== null) {
        const flatCourses = [];
        
        for (const key in courses) {
          if (Array.isArray(courses[key])) {
            flatCourses.push(...courses[key]);
          }
        }
        
        if (flatCourses.length > 0) {
          courses = flatCourses;
        } else {
          return null;
        }
      } else {
        return null;
      }
    }

    // Filter and clean
    const validCourses = courses
      .filter(c => typeof c === 'string' && c.length > 0 && c.length <= 80)
      .map(c => c.trim())
      .slice(0, 20);

    // Apply post-processing to clean up results
    const processedCourses = postProcessCourses(validCourses);
    
    return processedCourses.length > 0 ? processedCourses : null;

  } catch (error) {
    return null;
  }
}

/**
 * Use Ollama to validate and clean extracted course data
 * @param {string[]} courses - Courses extracted by scraper
 * @returns {Promise<string[]>} - Cleaned courses
 */
async function validateCoursesWithOllama(courses) {
  if (!courses || courses.length === 0) {
    return courses;
  }

  try {
    if (!await isOllamaAvailable()) {
      return courses;
    }

    const prompt = `You are an intelligent validator for scholarship course data. Your job is to clean a list of extracted courses by removing invalid items while preserving all legitimate academic programs.

🔍 INPUT COURSES:
${JSON.stringify(courses, null, 2)}

📋 VALIDATION RULES:

❌ REMOVE ONLY IF EXACTLY MATCHES:
1. Grade Requirements: Contains patterns like "3As", "5A+", "8A*", "AAA", "3.5 GPA"
   Examples to remove: "STPM - 3As", "A-Level: AAA", "Minimum 5As", "3.5 CGPA required"

2. Qualification Names ALONE (without field): "STPM", "SPM", "A-Level", "O-Level", "UEC", "Matriculation", "Foundation"
   Note: Keep if combined with field like "STPM Science Stream"

3. Navigation/Generic: "Home", "About", "Contact Us", "Apply", "Click here", "Read more"

4. Non-Academic: "Age 18-25", "Malaysian citizens only", "B40 household", "Financial need"

✅ KEEP ALWAYS:
- Academic programs: "Computer Science", "Engineering", "Medicine", "Business", "Psychology"
- Fields of study: "Information Technology", "Accounting", "Law", "Nursing", "Architecture"
- Engineering specializations: "Civil Engineering", "Mechanical Engineering", "Electrical Engineering", "Chemical Engineering"
- Sub-disciplines: "Quantity Surveying", "Building Management", "Highway Engineering", "Construction Management"
- STEM subjects: "Mathematics", "Physics", "Chemistry", "Biology", "Statistics"
- Broad categories: "Science", "Arts", "Commerce", "Technology", "Social Sciences"
- Degree types: "Bachelor of Engineering", "Master of Business Administration"
- Specific majors: "Software Engineering", "Graphic Design", "Interior Design"
- Combined fields: "Science & Technology", "Business & Economics"
- Technical fields: "Structure", "Hydraulic", "Geo-technical", "Pavement"

⚠️ WHEN IN DOUBT → KEEP IT!

🎯 TASK: Return a cleaned JSON array containing ONLY valid academic courses/fields.

RESPONSE (JSON array only):`;

    const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
      model: MODEL_NAME,
      prompt: prompt,
      stream: false,
      options: {
        ...OLLAMA_OPTIONS, // Use CPU-only settings
        temperature: 0.15, // Slightly more flexible
        top_p: 0.95,
        num_predict: 400, // More tokens for larger lists
      }
    }, {
      timeout: 30000 // 30 seconds for validation
    });

    const responseText = response.data.response.trim();
    
    const jsonText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Try to find JSON array
    const jsonMatch = jsonText.match(/\[[\s\S]*?\]/);
    if (!jsonMatch) {
      return courses;
    }

    const cleaned = JSON.parse(jsonMatch[0]);

    // Safety check: if Ollama removed ALL courses but we had valid input, keep originals
    if (cleaned.length === 0 && courses.length > 0) {
      return courses;
    }
    
    return Array.isArray(cleaned) && cleaned.length > 0 ? cleaned : courses;

  } catch (error) {
    return courses; // Return original on error
  }
}

/**
 * Post-process and clean extracted courses
 * @param {string[]} courses - Raw extracted courses
 * @returns {string[]} - Cleaned and deduplicated courses
 */
function postProcessCourses(courses) {
  if (!courses || courses.length === 0) return courses;

  const cleaned = courses
    // Remove extra whitespace
    .map(c => c.trim())
    // Remove duplicates (case insensitive)
    .filter((course, index, self) => 
      index === self.findIndex(c => c.toLowerCase() === course.toLowerCase())
    )
    // Remove very short entries (likely noise)
    .filter(c => c.length >= 3)
    // Remove entries that are just numbers or symbols
    .filter(c => /[a-zA-Z]/.test(c))
    // Remove grade-like patterns
    .filter(c => !/(^\d+A[s\+\*]?$|^\d+\.\d+\s*(CGPA|GPA))/i.test(c))
    // Remove qualification exam names when standalone
    .filter(c => !(/^(STPM|SPM|A-Level|O-Level|UEC|Matriculation|Foundation)$/i.test(c)))
    // Sort alphabetically
    .sort((a, b) => a.localeCompare(b));

  return cleaned;
}

/**
 * Initialize and check Ollama status
 */
async function initializeOllama() {
  const available = await isOllamaAvailable();
  
  if (available) {
    const models = await getAvailableModels();
    console.log('✅ Ollama AI is running');
    console.log(`   Available models: ${models.map(m => m.name).join(', ')}`);
    
    // Check if recommended model is available
    const hasLlama32 = models.some(m => m.name.includes('llama3.2'));
    if (!hasLlama32) {
      console.log('⚠️  Recommended model "llama3.2:3b" not found');
      console.log('   Run: ollama pull llama3.2:3b');
    }
  } else {
    console.log('⚠️  Ollama not running - AI extraction disabled');
    console.log('   To enable: Start Ollama app or run "ollama serve"');
  }
  
  return available;
}

module.exports = {
  extractCoursesWithOllama,
  validateCoursesWithOllama,
  initializeOllama,
  isOllamaAvailable,
};
