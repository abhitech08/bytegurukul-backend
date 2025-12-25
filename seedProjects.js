require('dotenv').config();
const db = require('./models');

const projectsData = [
    { 
        title: 'E-Commerce Website', 
        domain: 'Web Development', 
        price: 49, 
        technologies: ['React', 'Node.js', 'MongoDB', 'Stripe'], 
        description: 'Full-stack e-commerce platform with payment integration, admin panel, and inventory management', 
        icon: '🛒', 
        features: ['Payment Integration', 'Admin Dashboard', 'User Authentication', 'Product Reviews'], 
        rating: 4.8, 
        difficulty: 'Intermediate' 
    },
    { 
        title: 'Weather App', 
        domain: 'Mobile Development', 
        price: 49, 
        technologies: ['Android', 'Kotlin', 'API Integration'], 
        description: 'Real-time weather application with location services and 7-day forecast', 
        icon: '🌤️', 
        features: ['Location Services', '7-Day Forecast', 'Weather Alerts'], 
        rating: 4.5, 
        difficulty: 'Beginner' 
    },
    { 
        title: 'Student Management System', 
        domain: 'Desktop Application', 
        price: 49, 
        technologies: ['Java', 'MySQL', 'Swing'], 
        description: 'Complete student record management system with attendance and grade tracking', 
        icon: '🎓', 
        features: ['Student Records', 'Attendance System', 'Grade Management'], 
        rating: 4.2, 
        difficulty: 'Intermediate' 
    },
    { 
        title: 'Chat Application', 
        domain: 'Web Development', 
        price: 49, 
        technologies: ['React', 'Socket.io', 'Express'], 
        description: 'Real-time chat application with multiple rooms, file sharing, and emoji support', 
        icon: '💬', 
        features: ['Real-time Chat', 'File Sharing', 'Multiple Rooms'], 
        rating: 4.7, 
        difficulty: 'Advanced' 
    },
    { 
        title: 'Expense Tracker', 
        domain: 'Mobile Development', 
        price: 49, 
        technologies: ['Flutter', 'Charts'], 
        description: 'Personal finance management app with analytics and budget planning', 
        icon: '💰', 
        features: ['Expense Analytics', 'Budget Planning', 'Reports'], 
        rating: 4.6, 
        difficulty: 'Beginner' 
    },
    { 
        title: 'Library Management', 
        domain: 'Web Development', 
        price: 49, 
        technologies: ['PHP', 'MySQL', 'Bootstrap'], 
        description: 'Digital library system with book tracking, member management, and fine calculation', 
        icon: '📖', 
        features: ['Book Tracking', 'Member Management', 'Fine System'], 
        rating: 4.1, 
        difficulty: 'Intermediate' 
    }
];

const seedDB = async () => {
    try {
        await db.sequelize.authenticate();
        console.log('🔌 Connected to DB');
        
        // Sync specifically ensures the Project table exists
        await db.Project.sync({ force: true }); 
        console.log('🔄 Project Table Created/Reset');

        await db.Project.bulkCreate(projectsData);
        console.log('✅ Projects seeded successfully!');
        
        process.exit();
    } catch (err) {
        console.error('❌ Error seeding data:', err);
        process.exit(1);
    }
};

seedDB();