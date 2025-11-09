// Script to clean up scholarships that have grade requirements in eligibleCourses field
const mongoose = require('mongoose');
require('dotenv').config();

const Scholarship = require('../models/Scholarship');

const looksLikeGrade = (s) => {
  return /\b(STPM|A-Level|UEC|O-Level|SPM|IGCSE|IB)\b/i.test(s) && 
         /\d+\s*A['s]*/i.test(s);
};

async function cleanGradeData() {
  try {
    const mongoURI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/dreamfundDB";
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');

    const scholarships = await Scholarship.find({});
    console.log(`📊 Found ${scholarships.length} scholarships to check`);

    let cleanedCount = 0;

    for (const scholarship of scholarships) {
      if (scholarship.eligibleCourses && scholarship.eligibleCourses.length > 0) {
        const originalCount = scholarship.eligibleCourses.length;
        
        // Filter out grade patterns
        const cleanedCourses = scholarship.eligibleCourses.filter(course => {
          return !looksLikeGrade(course);
        });

        if (cleanedCourses.length !== originalCount) {
          scholarship.eligibleCourses = cleanedCourses.length > 0 ? cleanedCourses : null;
          await scholarship.save();
          cleanedCount++;
          
          console.log(`\n🧹 Cleaned: ${scholarship.title}`);
          console.log(`   Removed ${originalCount - cleanedCourses.length} grade entries`);
          console.log(`   Remaining courses: ${cleanedCourses.length}`);
        }
      }
    }

    console.log(`\n✅ Cleanup complete! Cleaned ${cleanedCount} scholarships`);
    
    await mongoose.disconnect();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

cleanGradeData();
