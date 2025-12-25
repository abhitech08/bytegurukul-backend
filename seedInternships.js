require('dotenv').config();
const db = require('./models');

const internshipsData = [
  {
    title: 'Android Development Internship',
    description: 'Learn Android app development using Kotlin and Java. Build real-world mobile applications.',
    duration: '3 months',
    startDate: new Date('2024-02-01'),
    endDate: new Date('2024-04-30'),
    createdBy: 1 // Assuming admin user has id 1
  },
  {
    title: 'Full Stack Web Development Internship',
    description: 'Master both frontend and backend development with modern technologies like React, Node.js, and databases.',
    duration: '4 months',
    startDate: new Date('2024-03-01'),
    endDate: new Date('2024-06-30'),
    createdBy: 1
  },
  {
    title: 'Cyber Security Analyst Internship',
    description: 'Learn ethical hacking, network security, and cybersecurity best practices.',
    duration: '6 months',
    startDate: new Date('2024-01-15'),
    endDate: new Date('2024-07-15'),
    createdBy: 1
  },
  {
    title: 'Python Development Internship',
    description: 'Develop Python applications, work with data science libraries, and build automation tools.',
    duration: '3 months',
    startDate: new Date('2024-04-01'),
    endDate: new Date('2024-06-30'),
    createdBy: 1
  },
  {
    title: 'Data Analyst Internship',
    description: 'Analyze data using Python, SQL, and visualization tools. Learn data-driven decision making.',
    duration: '3 months',
    startDate: new Date('2024-05-01'),
    endDate: new Date('2024-07-31'),
    createdBy: 1
  },
  {
    title: 'UI/UX Design Internship',
    description: 'Design user interfaces and experiences using Figma, Adobe XD, and prototyping tools.',
    duration: '3 months',
    startDate: new Date('2024-06-01'),
    endDate: new Date('2024-08-31'),
    createdBy: 1
  }
];

const seedInternships = async () => {
  try {
    await db.sequelize.authenticate();
    console.log('🔌 Connected to DB');

    // Sync the database first to ensure all tables exist with proper associations
    console.log('🔄 Syncing database...');
    await db.syncDatabase(); // This will create all tables with proper associations

    // Ensure an admin user exists
    let admin = await db.User.findOne({ where: { role: 'admin' } });
    if (!admin) {
      // Create a default admin if none exists
      admin = await db.User.create({
        username: 'DefaultAdmin',
        email: 'admin@bytegurukul.com',
        password: 'password123', // This will be hashed by the model hook
        role: 'admin',
        name: 'Default Admin'
      });
      console.log('✅ Default admin created');
    }

    // Update internshipsData with the correct createdBy
    const updatedInternshipsData = internshipsData.map(internship => ({
      ...internship,
      createdBy: admin.id
    }));

    // Clear existing internships before seeding
    await db.Internship.destroy({ where: {} });
    console.log('🗑️ Cleared existing internships');

    await db.Internship.bulkCreate(updatedInternshipsData);
    console.log('✅ Internships seeded successfully!');

    process.exit();
  } catch (err) {
    console.error('❌ Error seeding internships:', err);
    process.exit(1);
  }
};

seedInternships();
