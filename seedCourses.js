require('dotenv').config();
const db = require('./models');

const coursesData = [
  {
    name: 'Data Structures and Algorithms',
    code: 'CS201',
    description: 'Comprehensive course on data structures and algorithms with practical implementations',
    price: 0.00,
    category: 'Computer Science',
    level: 'Intermediate',
    duration: '12 weeks',
    thumbnail: '📊',
    semester: 3,
    modules: 8,
    lessons: 45,
    instructorId: 1 // Assuming admin user has id 1
  },
  {
    name: 'Database Management Systems',
    code: 'CS301',
    description: 'Learn SQL, NoSQL databases, normalization, and database design principles',
    price: 0.00,
    category: 'Computer Science',
    level: 'Intermediate',
    duration: '10 weeks',
    thumbnail: '🗄️',
    semester: 4,
    modules: 6,
    lessons: 35,
    instructorId: 1
  },
  {
    name: 'Web Development Fundamentals',
    code: 'CS401',
    description: 'HTML, CSS, JavaScript, and modern web development frameworks',
    price: 0.00,
    category: 'Web Development',
    level: 'Beginner',
    duration: '8 weeks',
    thumbnail: '🌐',
    semester: 5,
    modules: 5,
    lessons: 30,
    instructorId: 1
  },
  {
    name: 'Operating Systems',
    code: 'CS501',
    description: 'Process management, memory management, file systems, and OS concepts',
    price: 0.00,
    category: 'Computer Science',
    level: 'Advanced',
    duration: '14 weeks',
    thumbnail: '💻',
    semester: 6,
    modules: 9,
    lessons: 50,
    instructorId: 1
  },
  {
    name: 'Software Engineering',
    code: 'CS601',
    description: 'Software development lifecycle, agile methodologies, and project management',
    price: 0.00,
    category: 'Software Engineering',
    level: 'Intermediate',
    duration: '12 weeks',
    thumbnail: '🔧',
    semester: 7,
    modules: 7,
    lessons: 40,
    instructorId: 1
  },
  {
    name: 'Machine Learning',
    code: 'CS701',
    description: 'Introduction to machine learning algorithms, neural networks, and AI concepts',
    price: 0.00,
    category: 'Artificial Intelligence',
    level: 'Advanced',
    duration: '16 weeks',
    thumbnail: '🤖',
    semester: 8,
    modules: 10,
    lessons: 55,
    instructorId: 1
  }
];

const seedCourses = async () => {
  try {
    await db.sequelize.authenticate();
    console.log('🔌 Connected to DB');

    // FIX: Sync the database first to ensure all tables exist with proper associations
    console.log('🔄 Syncing database...');
    await db.syncDatabase(); // This will create all tables with proper associations

    // Ensure an instructor exists
    let instructor = await db.User.findOne({ where: { role: 'instructor' } });
    if (!instructor) {
      instructor = await db.User.findOne({ where: { role: 'admin' } });
      if (!instructor) {
        // Create a default instructor if none exists
        instructor = await db.User.create({
          username: 'DefaultInstructor',
          email: 'instructor@bytegurukul.com',
          password: 'password123', // This will be hashed by the model hook
          role: 'instructor',
          name: 'Default Instructor'
        });
        console.log('✅ Default instructor created');
      }
    }

    // Update coursesData with the correct instructorId
    const updatedCoursesData = coursesData.map(course => ({
      ...course,
      instructorId: instructor.id
    }));

    // Clear existing courses before seeding
    await db.Course.destroy({ where: {} });
    console.log('🗑️ Cleared existing courses');

    await db.Course.bulkCreate(updatedCoursesData);
    console.log('✅ Courses seeded successfully!');

    process.exit();
  } catch (err) {
    console.error('❌ Error seeding courses:', err);
    process.exit(1);
  }
};

seedCourses();