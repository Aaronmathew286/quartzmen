const User = require("../../models/user")
const Product = require("../../models/product")
const Category = require("../../models/category")




const productmanagement = async (req, res) => {

    try {
        const products = await Product.find();
        const existingCategories = await Category.find()
        // Simplify the object passed to the template for testing
        res.render("admin/productmanagement", { status: true, products: products, existingCategories: existingCategories });
    } catch (error) {
        console.log(error);
    }

};


const addproduct = async (req, res) => {
    try {
        const products = await Product.find();
        const existingCategories = await Category.find(); // Fetch categories from the database
        console.log("Categories fetched:", existingCategories); // Check what categories are being fetched
        
        res.render("admin/addproduct", { status: true, existingCategories: existingCategories, products: products });
    } catch (error) {
        console.log("Error fetching categories:", error);
    }
}


const addproductpost = async (req, res) => {
    try {
        const files = req.files;
        console.log("Hello",files);
        
        const name = req.body.name;
        const brand = req.body.brand;
        const strapMaterial = req.body.strapMaterial.toLowerCase();
        const gender = req.body.gender;
        const category = req.body.categories;
        const stock = parseInt(req.body.stock, 10);
        const originalPrice = parseFloat(req.body.originalPrice); // Ensure this matches schema
        const offerPercentage = parseFloat(req.body.offerPercentage);
        const description = req.body.description;

        console.log("This is the original price",originalPrice)
        
        // Validate Offer Percentage
        if (isNaN(offerPercentage) || offerPercentage < 0 || offerPercentage > 90) {
            return res.render('admin/addproduct', {
                errMessage: 'Offer percentage must be between 0% and 90%',
                existingCategories: [] 
            });
        }

        // Validate Gender
        const allowedGenders = ["male", "female"];
        if (!allowedGenders.includes(gender)) {
            return res.render('admin/addproduct', { errMessage: 'Gender must be one of "male", "female"', existingCategories: [] });
        }

        // Original Price:
        if (isNaN(originalPrice)) {
            return res.render('admin/addproduct', {
                errMessage: 'Original Price must be a valid number',
                existingCategories: []
            });
        }
        if (!files || files.length === 0) {
            return res.render('admin/addproduct', {
                errMessage: 'No images were uploaded',
                existingCategories: [] // Adjust as needed
            });
        }

        // Validate Stock
        if (isNaN(stock) || stock < 0 || stock >=100) {
            return res.render('admin/addproduct', { errMessage: 'Stock must be a non-negative number', existingCategories: [] });
        }

        // Validate Strap Material
        const allowedStrapMaterials = [
            "leather strap",
            "stainless steel",
            "nylon strap",
            "silicon rubber",
            "ceramic band",
            "mesh band",
            "titanium band"
        ];
        if (!allowedStrapMaterials.includes(strapMaterial)) {
            return res.render('admin/addproduct', { errMessage: 'Strap material must be one of the given materials', existingCategories: [] });
        }
        console.log("hwloloo")
        // Create a new product


        const price = originalPrice - (originalPrice * (offerPercentage / 100));
        console.log("Calculated Price:", price);

        const product = new Product({
            name: name,
            brand: brand,
            strapMaterial: strapMaterial,
            gender: gender,
            category: category,
            description: description,
            stock: stock,
            originalPrice: parseFloat(originalPrice), // Ensure this field name is correct
            offerPercentage: parseFloat(offerPercentage),
            price:price,
            images: files.map(file => file.path), // Use 'images' to match schema
        });
        console.log(product)

        // Save the product
        await product.save();
        console.log(product)
        res.redirect('/admin/productmanagement');
    } catch (error) {
        console.error("Error during adding:", error);
        res.status(500).send("Internal server error");
    }
};


1


const editproduct = async (req, res) => {
    try {
        const updateProduct = await Product.find()
        const existingCategory = await Category.find()

        const id = req.params._id;
        const editProduct = await Product.findById(id)
        console.log(editProduct)


        res.render('admin/editproduct', { product: editProduct, existingCategories: existingCategory, updateProducts: updateProduct })

    } catch (error) {
        console.log("error while adding product:", error);
        res.status(404).send("Error Occured...")
    }
}

const editproductpost = async (req, res) => {
    try {
        const { name, brand, strapMaterial, gender, category, stock, description, originalPrice, offerPercentage } = req.body;

        const productId = req.params._id;
        const imageFile = req.files;
        const products = await Product.findById(productId);

        if (!products) {
            return res.status(404).send("Product not found");
        }

        // Update product details
        products.name = name;
        products.brand = brand;
        products.strapMaterial = strapMaterial;
        products.gender = gender;
        products.category = category;
        products.stock = stock;
        products.description = description;
        products.originalPrice = originalPrice;
        products.offerPercentage = offerPercentage;
        products.price = originalPrice - (originalPrice * (offerPercentage / 100));

        if (stock < 0) {
            return res.redirect('/admin/productmanagement');
        }

        if (imageFile && imageFile.length > 0) {
            products.image = products.image.concat(imageFile.map(file => file.filename));
        }

        // Save the updated product
        await products.save();
        res.redirect('/admin/productmanagement');
    } catch (error) {
        console.log("Error while updating product:", error);
        res.status(500).send(error.message);
    }
};



const blockproductpost = async (req, res) => {
    try {
        const productID = req.params._id;
        console.log(productID);
        const product = await Product.updateOne({ _id: productID }, { $set: { isBlocked: true } })
        console.log(product)
        res.redirect("/admin/productmanagement")
    } catch (error) {
        console.log("error in block", error)
    }

};

const unblockproductpost = async (req, res) => {
    try {
        const productID = req.params._id;
        console.log(productID);
        const product = await Product.updateOne({ _id: productID }, { $set: { isBlocked: false } })
        console.log(product)
        res.redirect("/admin/productmanagement")
    } catch (error) {
        console.log("error in block", error)
    }
};

module.exports = {

    productmanagement,
    addproduct,
    editproduct,
    addproductpost,
    editproductpost,
    blockproductpost,
    unblockproductpost,

}