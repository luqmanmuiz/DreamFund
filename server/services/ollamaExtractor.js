const axios = require('axios');

// Ollama API endpoint (runs locally) - use 127.0.0.1 instead of localhost to force IPv4
const OLLAMA_URL = 'http://127.0.0.1:11434';
const MODEL_NAME = 'llama3.2:1b'; // Using 1b model (3b requires too much RAM)

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

    // Clean the text but PRESERVE newlines for better structure detection
    let cleanedText = pageText
      // Remove CSS-like patterns (anything with curly braces, semicolons, colons in CSS properties)
      .replace(/\{[^}]*\}/g, ' ')
      .replace(/\.[a-z0-9_-]+\s*\{[^}]*\}/gi, ' ')
      .replace(/[a-z-]+\s*:\s*[^;]+;/gi, ' ')
      // Remove data URIs and base64
      .replace(/data:[^;]+;base64[^"'\s]+/gi, ' ')
      // Remove JSON objects (likely __NEXT_DATA__ or app state)
      .replace(/\{"[^"]+"\s*:\s*[^}]+\}/g, ' ')
      // Remove hex color codes
      .replace(/#[0-9a-f]{3,8}\b/gi, ' ')
      // Remove pixel/unit measurements
      .replace(/\d+(?:px|em|rem|vh|vw|%)/g, ' ')
      // Normalize spaces on each line but keep newlines
      .split('\n')
      .map(line => line.trim().replace(/\s+/g, ' '))
      .filter(line => line.length > 0)
      .join('\n')
      .trim();

    // Try to find and extract the "Preferred Discipline" or "Eligible Courses" section directly
    let focusedText = cleanedText;
    const disciplineMatch = cleanedText.match(/Preferred\s+Discipline[:\s]*([\s\S]{0,300}?)(?:Read more|Amount Info|Contact|How to apply|Email|Tel|$)/i);
    const coursesMatch = cleanedText.match(/Eligible\s+Courses[:\s]*([\s\S]{0,300}?)(?:Read more|Amount Info|Contact|How to apply|Email|Tel|$)/i);
    const fieldsMatch = cleanedText.match(/Fields?\s+of\s+Study[:\s]*([\s\S]{0,300}?)(?:Read more|Amount Info|Contact|How to apply|Email|Tel|$)/i);
    const programMatch = cleanedText.match(/\b(Programme|Program)[:\s]+([\s\S]{0,400}?)(?:at\s+[A-Z]{2,}|Criteria|Read more|Contact|$)/i);
    
    // If program match found, use capture group 2 (the actual program text)
    const programText = programMatch ? programMatch[2].trim() : null;
    
    if (disciplineMatch || coursesMatch || fieldsMatch || programText) {
      // Use the focused section if found
      focusedText = (disciplineMatch || coursesMatch || fieldsMatch || [null, programText])[1].trim();
      
      // Check if this section looks like it has course content
      // Either multiple lines OR contains common course keywords OR is short and specific
      const lines = focusedText.split(/\n+/).map(l => l.trim()).filter(l => l.length > 2);
      const hasCourseKeywords = /engineering|science|technology|business|management|accounting|medicine|law|architecture|nursing|computer|mathematics|physics|chemistry|biology/i.test(focusedText);
      const isShortSpecific = focusedText.length >= 5 && focusedText.length <= 100 && /^[A-Z]/.test(focusedText);
      
      if (lines.length >= 2 || hasCourseKeywords || isShortSpecific) {
        // Try direct line-by-line extraction first (works for most structured lists)
        if (lines.length >= 2 && lines.length <= 20) {
          if (process.env.DEBUG_AI) {
            console.log(`\n🔍 Trying direct line extraction: ${lines.length} lines found`);
            lines.forEach((l, i) => console.log(`  Line ${i+1}: "${l}"`));
          }
          
          const directCourses = lines
            .filter(l => l.length >= 3 && l.length < 150)
            .filter(l => !/^(Preferred|Discipline|Eligible|Courses?|Programme?|Program|Fields?|Study|Read|more|Contact|Apply|Email|Tel)$/i.test(l));
          
          if (process.env.DEBUG_AI) {
            console.log(`  After filtering: ${directCourses.length} courses`);
            directCourses.forEach((c, i) => console.log(`    ${i+1}. "${c}"`));
          }
          
          if (directCourses.length >= 2) {
            const processed = postProcessCourses(directCourses);
            if (process.env.DEBUG_AI) {
              console.log(`  After post-processing: ${processed.length} courses`);
              processed.forEach((c, i) => console.log(`    ${i+1}. "${c}"`));
            }
            
            if (processed.length >= 2) {
              if (process.env.DEBUG_AI) {
                console.log('✅ Direct line extraction (no AI) - SUCCESS:', processed);
              }
              return processed;
            }
          }
        }
        
        // Check if this is a simple, comma-separated case
        if (focusedText.length < 100 && lines.length <= 2) {
          // Try direct extraction without AI for simple cases
          const directCourses = focusedText
            .split(/[,;]|\band\b|\bor\b/)
            .map(c => c.trim())
            .filter(c => c.length > 2 && c.length < 80)
            .filter(c => !/^(Preferred|Discipline|Eligible|Courses?|Programme?|Program|Fields?|Study)$/i.test(c));
          
          if (directCourses.length > 0) {
            const processed = postProcessCourses(directCourses);
            if (processed.length > 0) {
              if (process.env.DEBUG_AI) {
                console.log('✅ Direct extraction (no AI):', processed);
              }
              return processed;
            }
          }
        }
        
        // This looks like a course list! Use it directly
        if (process.env.DEBUG_AI) {
          console.log('\n🔍 FOCUSED TEXT SENT TO AI:', focusedText);
        }
        
        const prompt = `Extract academic courses/fields from this text. Each line is a separate course.

RULES:
1. If items are on separate lines, they are SEPARATE courses
2. If items have commas/slashes on same line, split them: "A, B" → ["A", "B"]
3. Remove headers like "Preferred Discipline"
4. Remove instructions like "Read more"
5. Keep all engineering specializations and technical terms

Text:
${focusedText}

Expected format: JSON array only
Example: ["Civil Engineering", "Structure", "Hydraulic", "Mechanical Engineering"]

Response:`;


        const response = await Promise.race([
          axios.post(`${OLLAMA_URL}/api/generate`, {
            model: MODEL_NAME,
            prompt: prompt,
            stream: false,
            options: {
              ...OLLAMA_OPTIONS,
              temperature: 0.2, // Slightly higher temp for 3b model
              top_p: 0.9,
              num_predict: 1000, // More tokens for complete extraction
            }
          }, {
            timeout: 90000, // 90 seconds for 3b model
            headers: { 'Content-Type': 'application/json' }
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 60000)) // 60 sec timeout
        ]);

        const responseText = response.data.response.trim();
        
        // Debug logging
        if (process.env.DEBUG_AI) {
          console.log('\n🔍 AI RESPONSE (focused):', responseText.substring(0, 300));
        }
        
        // Parse the AI response
        try {
          // Extract JSON array from response (handle extra text before/after)
          const arrayMatch = responseText.match(/\[[\s\S]*?\]/);
          if (!arrayMatch) {
            throw new Error('No JSON array found in response');
          }
          
          const jsonText = arrayMatch[0]
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();
          
          let courses = JSON.parse(jsonText);
          
          // Handle array directly
          if (Array.isArray(courses) && courses.length > 0) {
            const validCourses = courses
              .filter(c => typeof c === 'string' && c.length > 0 && c.length <= 80)
              .map(c => c.trim())
              .slice(0, 20);
            
            const processed = postProcessCourses(validCourses);
            if (processed.length > 0) {
              if (process.env.DEBUG_AI) {
                console.log('✅ Processed courses:', processed);
              }
              return processed;
            }
          }
        } catch (e) {
          // Failed to parse focused extraction, fall through to full text
          if (process.env.DEBUG_AI) {
            console.log('❌ Failed to parse focused extraction:', e.message);
          }
        }
      }
    }

    // Fallback: Use full text with general prompt
    const truncatedText = cleanedText.slice(0, 6000);

    const prompt = `Task: Extract eligible course names from scholarship text.

PRIORITY: Look for "Preferred Discipline" section first. If found, extract ALL items listed under it.

Steps:
1. Search for "Preferred Discipline" or "Eligible Courses" or "Fields of Study" heading
2. Extract ALL courses/fields listed immediately after that heading
3. Include all engineering specializations and technical fields
4. Stop when you reach "Read more" or "Contact" or next section

Exclude:
- Section headers themselves ("Preferred Discipline", "Courses")
- Grade requirements ("3As", "5A's", "CGPA")
- Qualifications ("STPM", "SPM", "A-Level")
- Generic words ("All", "Any", "Other")

If "Preferred Discipline" section not found AND text says "open to all courses", return: ["All Fields"]

TEXT:
${truncatedText}

Return JSON array: ["Course 1", "Course 2", ...]`;

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
          temperature: 0.3, // Increased from 0.2 for better coverage
          top_p: 0.95, // Increased from 0.9 for more diversity
          num_predict: 1500, // Increased from 1200 for complete arrays
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

  // Generic terms that should not appear as standalone courses
  const genericTerms = [
    'courses', 'course', 'discipline', 'disciplines', 'field', 'fields',
    'program', 'programs', 'programme', 'programmes', 'major', 'majors',
    'study', 'studies', 'degree', 'degrees', 'preferred discipline',
    'eligible courses', 'fields of study', 'academic programs',
    'undergraduate', 'graduate', 'postgraduate', 'bachelor', 'master',
    'all', 'any', 'other', 'various', 'related'
  ];
  
  // But allow them when they're part of a specific course name
  const allowedPhrases = [
    'nursing programme', 'nursing programs', 'business program', 'engineering program'
  ];

  // First, expand any comma or slash-separated items
  let expanded = [];
  for (const course of courses) {
    const trimmed = course.trim();
    // Check if this looks like multiple items separated by comma or slash
    // e.g., "Structure, Hydraulic" or "Highway/ Pavement"
    if (trimmed.includes(',') || trimmed.includes('/')) {
      // Split by comma or slash
      const parts = trimmed.split(/[,\/]/)
        .map(p => p.trim())
        .filter(p => p.length > 0);
      
      // Only expand if we get 2-5 reasonable-length parts (not splitting something like a URL)
      if (parts.length >= 2 && parts.length <= 5 && parts.every(p => p.length >= 3 && p.length <= 50)) {
        expanded.push(...parts);
      } else {
        expanded.push(trimmed);
      }
    } else {
      expanded.push(trimmed);
    }
  }

  const cleaned = expanded
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
    // Remove generic terms UNLESS they're part of an allowed phrase
    .filter(c => {
      const lowerC = c.toLowerCase();
      // Check if it's an allowed phrase
      if (allowedPhrases.some(phrase => lowerC.includes(phrase))) {
        return true;
      }
      // Check if it's a standalone generic term
      return !genericTerms.some(term => term.toLowerCase() === lowerC);
    })
    // Clean up "X programmes" to just "X"
    .map(c => c.replace(/\s+(programmes?|programs?|courses?)$/i, ''))
    // Remove "at UNIVERSITY" patterns
    .map(c => c.replace(/\s+(?:at|in)\s+[A-Z]{2,}.*$/i, ''))
    // Remove grade-like patterns
    .filter(c => !/(^\d+A[s\+\*]?$|^\d+\.\d+\s*(CGPA|GPA))/i.test(c))
    // Remove qualification exam names when standalone
    .filter(c => !(/^(STPM|SPM|A-Level|O-Level|UEC|Matriculation|Foundation)$/i.test(c)))
    // Remove CSS-like text that might have slipped through
    .filter(c => !(/^(css-|Mui|display|position|flex|grid)/i.test(c)))
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
