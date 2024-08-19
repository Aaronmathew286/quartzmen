const User = require("../../models/user")
const Product = require("../../models/product")
const Category = require("../../models/category")


const profile = async (req, res) => {
    try {
        if (req.session.user) {
            const loggedIn = req.session.user;
            const addressId = req.params.id;
            console.log(addressId);
            const category = await Category.find({ isBlocked: false });
            const userData = await User.findById(loggedIn);
            if (!userData) {
                return res.redirect('/login');
            }

            // Ensure userAddress is defined
            const userAddress = (userData.profile.address && userData.profile.address.length > 0)
                ? userData.profile.address[0]
                : { name: 'N/A', house: 'N/A', city: 'N/A', phone: 'N/A', postalcode: 'N/A' };

            res.render('user/profile', { 
                user: true,
                userData: userData,
                userAddress: userAddress,
                category: category,
                loggedIn: loggedIn,
                addressId: addressId,
            });
        } else {
            res.redirect('/');
        }
    } catch (error) {
        console.log(error);
        res.status(500).send("Internal Server Error");
    }
};



// Handle user profile edit form submission
const editProfile = async (req, res) => {
    try {
        const { name, gender } = req.body;
        const userId = req.session.user; // Assuming user ID is stored in session

        if (!name || !gender) {
            console.log('Validation failed');
            return res.status(400).send('Name and gender are required');
        }

        // Normalize gender to match schema values
        const normalizedGender = gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase();

        // Validate gender value
        const validGenders = ['Male', 'Female'];
        if (!validGenders.includes(normalizedGender)) {
            console.log('Invalid gender value');
            return res.status(400).send('Invalid gender value');
        }

        const user = await User.findById(userId);
        if (!user) {
            console.error('User not found');
            return res.status(404).send('User not found');
        }

        user.name = name;
        user.gender = normalizedGender;

        console.log(`Updating user`);
        await user.save();
        console.log('Successfully updated');

        req.session.user = user;

        res.redirect('/profile');
    } catch (error) {
        console.error('Error during profile update:', error);
        res.status(500).send('Internal Server Error');
    }
};



const address = async (req, res) => {
    try {
        if (req.session.user) {
            const loggedIn = req.session.user;
            const userData = await User.findById(loggedIn);

            if (!userData) {
                return res.redirect('/login');
            }

            // Fetch all addresses for the user
            const userAddresses = userData.profile.address || [];

            res.render('user/address', { 
                user: true,
                userData: userData,
                addresses: userAddresses,
                loggedIn: loggedIn,
            });
        } else {
            res.redirect('/');
        }
    } catch (error) {
        console.log(error);
        res.status(500).send("Internal Server Error");
    }
};

const addAddress = async (req, res) => {
    try {
        const userId = req.session.user;
        console.log(userId);
        const { id, name, house, city, postalcode, phone } = req.body;
    
        // Find the user
        const user = await User.findById(userId);
        console.log("The user to be added the address", user);
        if (!user) {
            return res.status(404).send('User not found');
        }
    
        // Check if an ID is provided for an existing address
        if (id) {
            // Find the address index
            const addressIndex = user.profile.address.findIndex(addr => addr._id.toString() === id);
    
            if (addressIndex === -1) {
                return res.status(404).send('Address not found');
            }
    
            // Update the existing address
            user.profile.address[addressIndex] = {
                ...user.profile.address[addressIndex],
                name,
                house,
                city,
                postalcode,
                phone,
            };
        } else {
            // Add a new address
            user.profile.address.push({
                name,
                house,
                city,
                postalcode,
                phone,
            });
        }
    
        await user.save();
        res.redirect('/address'); // Redirect to the address page or wherever appropriate
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};


const editAddress = async (req, res) => {
    try {
        const addressId = req.params._id
        const { name, house, phone, postalcode, city } = req.body;
        const userId = req.session.user;
        
        // Find the user by email
        const userData = await User.findById(userId);

        // Find the index of the address to be updated
        const addressIndex = userData.profile.address.findIndex(addr => addr._id.toString() === addressId);
        if (addressIndex === -1) {
            return res.status(404).send("Address not found");
        }

        // Update the address details
        userData.profile.address[addressIndex].name = name;
        userData.profile.address[addressIndex].house = house;
        userData.profile.address[addressIndex].phone = phone;
        userData.profile.address[addressIndex].postalcode = postalcode;
        userData.profile.address[addressIndex].city = city;

        // Save the updated user data
        await userData.save();

        // Redirect to the manageAddress page
        return res.redirect('/address');
    } catch (error) {
        console.error("Error editing address:", error);
        return res.status(500).render('error', { message: "Error editing address" });
    }
}

const wallet = async (req, res) => {
    try {
        const user = User.find();
        res.render('user/wallet',{user});
    } catch (error) {
        console.error('Error fetching wallet information:', error);
        res.status(500).send('Internal Server Error');
    }
};

const updateWallet = async (req, res) => {
    try {
        const userId = req.user._id;
        const { amount, process } = req.body;

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).send('User not found');
        }

        user.walletbalance += parseFloat(amount);

        user.wallethistory.push({
            process: process,
            amount: parseFloat(amount),
            date: new Date(),
        });

        await user.save();

        res.status(200).json({ message: 'Wallet updated successfully', walletbalance: user.walletbalance });
    } catch (error) {
        console.error('Error updating wallet:', error);
        res.status(500).send('Internal Server Error');
    }
};





const search = async(req,res) => {
    const query = req.query.query || '';

    try {
        const products = await Product.find({
            name: { $regex: query, $options: 'i' } // Case-insensitive search
        });

        res.render('index', { products }); // Render the view with the search results
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};



module.exports = {
    // GET
    profile,
    address,
    search,
    wallet,


    // POST
    editProfile,
    addAddress,
    editAddress,
    updateWallet,

}