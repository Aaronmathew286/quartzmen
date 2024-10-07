const User = require("../../models/user")
const Product = require("../../models/product")
const Category = require("../../models/category")
const Razorpay = require('razorpay');
const bcrypt  = require('bcryptjs')



const profile = async (req, res) => {
    try {
        if (req.session.user) {
            const loggedIn = req.session.user;
            const addressId = req.params.id;
            const category = await Category.find({ isBlocked: false });
            const userData = await User.findById(loggedIn);
            if (!userData) {
                return res.redirect('/login');
            }
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
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};

const editProfile = async (req, res) => {
    try {
        const { name, gender } = req.body;
        const userId = req.session.user;
        if (!name || !gender) {
            return res.status(400).send('Name and gender are required');
        }
        const normalizedGender = gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase();
        const validGenders = ['Male', 'Female'];
        if (!validGenders.includes(normalizedGender)) {
            return res.status(400).send('Invalid gender value');
        }
        const user = await User.findById(userId);
        if (!user) {
            console.error('User not found');
            return res.status(404).send('User not found');
        }
        user.name = name;
        user.gender = normalizedGender;

        await user.save();
        res.redirect('/profile');
    } catch (error) {
        console.error('Error during profile update:', error);
        res.status(500).send('Internal Server Error');
    }
};

const resetPassword = async(req,res) => {
    const { oldPassword, newPassword, confirmNewPassword } = req.body;
    const errors = [];
    if (newPassword !== confirmNewPassword) {
        errors.push({ field: 'confirmNewPassword', message: 'New passwords do not match.' });
    }
    try {
        const userId = req.session.user; 
        const user = await User.findById(userId);

        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            errors.push({ field: 'oldPassword', message: 'Old password is incorrect.' });
        }

        if (errors.length > 0) {
            return res.status(400).json({ errors });
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        res.json({ message: 'Password has been successfully changed.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
}


const address = async (req, res) => {
    try {
        if (req.session.user) {
            const loggedIn = req.session.user;
            const userData = await User.findById(loggedIn);

            if (!userData) {
                return res.redirect('/login');
            }
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
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};

const addAddress = async (req, res) => {
    try {
        const userId = req.session.user;
        const { id, name, house, city, postalcode, phone } = req.body;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).send('User not found');
        }
        if (id) {
            const addressIndex = user.profile.address.findIndex(addr => addr._id.toString() === id);
            if (addressIndex === -1) {
                return res.status(404).send('Address not found');
            }

            user.profile.address[addressIndex] = {
                ...user.profile.address[addressIndex],
                name,
                house,
                city,
                postalcode,
                phone,
            };
        } else {
            user.profile.address.push({
                name,
                house,
                city,
                postalcode,
                phone,
            });
        }

        await user.save();
        res.redirect('/address');
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
        const userData = await User.findById(userId);
        const addressIndex = userData.profile.address.findIndex(addr => addr._id.toString() === addressId);
        if (addressIndex === -1) {
            return res.status(404).send("Address not found");
        }

        userData.profile.address[addressIndex].name = name;
        userData.profile.address[addressIndex].house = house;
        userData.profile.address[addressIndex].phone = phone;
        userData.profile.address[addressIndex].postalcode = postalcode;
        userData.profile.address[addressIndex].city = city;

        await userData.save();
        return res.redirect('/address');
    } catch (error) {
        console.error("Error editing address:", error);
        return res.status(500).render('error', { message: "Error editing address" });
    }
}

const wallet = async (req, res) => {
    try {
        const userId = req.session.user;
        const { page = 1, limit = 10 } = req.query; 
        const skip = (page - 1) * limit;
        const user = await User.findById(userId, 'wallet wallethistory').exec();
        if (!user) {
            return res.status(404).send('User not found');
        }

        const paginatedHistory = user.wallethistory.slice(skip, skip + parseInt(limit));
        paginatedHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
        const totalTransactions = user.wallethistory.length; 

        res.render('user/wallet', {
            user: {
                walletbalance: user.wallet,
                wallethistory: paginatedHistory,
            },
            currentPage: parseInt(page, 10),
            totalPages: Math.ceil(totalTransactions / limit),
            limit: parseInt(limit, 10),
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
};

const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
})

const createWalletOrder = async (req, res) => {
    try {
        const { amount, currency } = req.query;
        const parsedAmount = parseInt(amount);
        if (!parsedAmount || isNaN(parsedAmount)) {
            return res.status(400).json({ error: 'Invalid amount provided' });
        }
        const options = {
            amount: parsedAmount,
            currency: currency || 'INR',
            receipt: `receipt_order_${Math.floor(Math.random() * 1000000)}`,
        };
        const order = await razorpayInstance.orders.create(options);

        res.status(200).json({
            id: order.id,
            amount: order.amount,
            currency: order.currency,
        });
    } catch (error) {
        console.error('Error updating wallet:', error);
        res.status(500).send('Internal Server Error');
    }
};

const walletTransactionSuccess = async (req, res) => {
    try {
        const { razorpayPaymentId, amount } = req.body;
        const userId = req.session.user;
        const user = await User.findById(userId);
        if (user) {
            user.wallet += amount / 100;
            user.wallethistory.push({
                process: `Amount added to wallet.`,
                amount: amount / 100,
                status: 'Credited'
            })
            await user.save()
            res.status(200).send("Wallet updated successfully")
        }
    } catch (error) {
        res.status(500).send('Error Occured while processing transaction')
    }
}

const search = async (req, res) => {
    const query = req.query.query || '';

    try {
        const products = await Product.find({
            name: { $regex: query, $options: 'i' } 
        });

        res.render('index', { products });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};



module.exports = {

    profile,
    address,
    search,
    wallet,
    editProfile,
    addAddress,
    editAddress,
    createWalletOrder,
    walletTransactionSuccess,
    resetPassword

}