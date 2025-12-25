const bcrypt = require('bcryptjs');
const { User, sequelize } = require('./models');

const createAdmin = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // Check for secret key - commented out for debugging
        // const providedSecret = process.argv[2];
        // const expectedSecret = process.env.ADMIN_SECRET_KEY;

        // if (!expectedSecret) {
        //     console.error('ADMIN_SECRET_KEY not set in environment variables.');
        //     return;
        // }

        // if (providedSecret !== expectedSecret) {
        //     console.error('Invalid secret key. Admin creation denied.');
        //     return;
        // }

        console.log('Proceeding with admin creation (secret check disabled).');

        // --- CHANGE THESE DETAILS ---
        const adminData = {
            username: 'AdminUser',
            email: 'admin@bytegurukul.com',
            password: 'admin', // Plain text, model will hash it
            role: 'admin'
        };

        const existingAdmin = await User.findOne({ where: { email: adminData.email } });
        
        if (existingAdmin) {
            console.log('Admin user already exists. Updating password...');
            // Update the existing user's password
            // FIX: Pass plain password. The 'beforeUpdate' hook in User model will hash it.
            existingAdmin.password = adminData.password;
            existingAdmin.role = adminData.role; 
            await existingAdmin.save();
            console.log('Admin password updated successfully!');
        } else {
            // Create new admin
            // FIX: Pass plain password. The 'beforeCreate' hook in User model will hash it.
            const admin = await User.create({
                ...adminData
            });
            console.log(`Admin created successfully! \nEmail: ${admin.email} \nRole: ${admin.role}`);
        }

    } catch (error) {
        console.error('Error creating/updating admin:', error);
    } finally {
        await sequelize.close();
    }
};

createAdmin();