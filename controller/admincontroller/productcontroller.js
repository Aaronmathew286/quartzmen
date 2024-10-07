const Product = require("../../models/product")
const Category = require("../../models/category")


const productManagement = async (req, res) => {
    try {
        const productsPerPage = 7;
        const currentPage = parseInt(req.query.page) || 1; 

        const totalProducts = await Product.countDocuments();

        const products = await Product.find()
            .skip((currentPage - 1) * productsPerPage)
            .limit(productsPerPage);

        const existingCategories = await Category.find();

       
        res.render("admin/productmanagement", {
            status: true,
            products: products,
            existingCategories: existingCategories,
            currentPage: currentPage,
            totalProducts: totalProducts,
            productsPerPage: productsPerPage
        });
    } catch (error) {
        console.error("Error fetching products and categories:", error);
        res.status(500).send("Internal server error");
    }
};

const addProduct = async (req, res) => {
    try {
        const products = await Product.find();
        const existingCategories = await Category.find(); 
        
        res.render("admin/addproduct", { status: true, existingCategories: existingCategories, products: products });
    } catch (error) {
        console.error("Error fetching categories:", error);
        res.status(500).send("Internal server error");
    }
}

const addProductPost = async (req, res) => {
    try {

        const files = req.files ;
        const name = req.body.name;
        const brand = req.body.brand;
        const strapMaterial = req.body.strapMaterial.toLowerCase();
        const gender = req.body.gender;
        const category = req.body.categories;
        const stock = parseInt(req.body.stock, 10);
        const originalPrice = parseFloat(req.body.originalPrice);
        const offerPercentage = parseFloat(req.body.offerPercentage);
        const description = req.body.description;

        const allowedBrands = [
            "Titan",
            "Fastrack",
            "Casio",
            "Timex",
            "Citizen",
            "Fossil",
            "Seiko",
            "Michael Kors",
            "Tommy Hilfiger",
            "Emporio Armani",
            "Daniel Wellington",
            "Guess"
        ];
        if (!allowedBrands.includes(brand)) {
            return res.render("admin/addproduct", { errMessage: "There brand is not added"});
        }

        if (isNaN(offerPercentage) || offerPercentage < 0 || offerPercentage > 90) {
            return res.render('admin/addproduct', {
                errMessage: 'Offer percentage must be between 0% and 90%'
            });
        }

        const allowedGenders = ["male", "female"];
        if (!allowedGenders.includes(gender)) {
            return res.render('admin/addproduct', { errMessage: 'Gender must be one of "male", "female"'});
        }

        if (isNaN(originalPrice)) {
            return res.render('admin/addproduct', {
                errMessage: 'Original Price must be a valid number',
            });
        }

        if (isNaN(stock) || stock <= 0 ) {
            return res.render('admin/addproduct', { errMessage: 'Stock must be a non-negative number'});
        }

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
            return res.render('admin/addproduct', { errMessage: 'Strap material must be one of the given materials' });
        }

        const price = originalPrice - (originalPrice * (offerPercentage / 100));

        let imagePaths = [];
        if (files.length > 0 || files.length > 5) {
            imagePaths = files.map(file => file.filename); 
        } else {
            console.error("No images were uploaded.");
        }

        const productData = {
            name: name,
            brand: brand,
            strapMaterial: strapMaterial,
            gender: gender,
            category: category,
            description: description,
            stock: stock,
            originalPrice: parseFloat(originalPrice),
            offerPercentage: parseFloat(offerPercentage),
            price: price,
            image: imagePaths,
        };

        const newProduct = await Product.insertMany([productData])
        return res.redirect('/admin/productmanagement');

    } catch (error) {
        console.error("Error during adding:", error);
        return res.status(500).send("Internal server error");
    }
};

const editProduct = async (req, res) => {
    try {
        const updateProduct = await Product.find()
        const existingCategory = await Category.find()
        const id = req.params._id;
        const editProduct = await Product.findById(id)

        res.render('admin/editproduct', { product: editProduct, existingCategories: existingCategory, updateProducts: updateProduct, errMessage:'' })
    } catch (error) {
        console.error("error while adding product:", error);
        res.status(404).send("Error Occured...")
    }
}

const editProductPost = async (req, res) => {
    try {
        const { name, brand, strapMaterial, gender, category, stock, description, originalPrice, offerPercentage, deletedImages } = req.body;
        const productId = req.params._id;
        const imageFiles = req.files; 
        const updateProduct = await Product.find();
        const existingCategory = await Category.find();
        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).send("Product not found");
        }

        product.name = name;
        product.brand = brand;
        product.strapMaterial = strapMaterial;
        product.gender = gender;
        product.category = category;
        product.stock = stock;
        product.description = description;
        product.originalPrice = originalPrice;
        product.offerPercentage = offerPercentage;
        product.price = originalPrice - (originalPrice * (offerPercentage / 100));

        if (stock < 0) {
            return res.render('admin/editproduct', { product, existingCategories: existingCategory, updateProducts: updateProduct, errMessage: 'Give proper stock' });
        }
        if (originalPrice < 0) {
            return res.render('admin/editproduct', { product, existingCategories: existingCategory, updateProducts: updateProduct, errMessage: 'Give price more than 0' });
        }
        if (offerPercentage < 0 || offerPercentage > 90) {
            return res.render('admin/editproduct', { product, existingCategories: existingCategory, updateProducts: updateProduct, errMessage: 'Give between 0 to 90' });
        }
        if (deletedImages && Array.isArray(deletedImages)) {
            deletedImages.forEach(image => {
                const index = product.image.indexOf(image);
                if (index > -1) {
                    product.image.splice(index, 1);
                }
            });
        }

        const totalImages = product.image.length + (imageFiles ? imageFiles.length : 0); 
        if (totalImages > 6) {
            return res.render('admin/editproduct', {
                product,
                existingCategories: existingCategory,
                updateProducts: updateProduct,
                errMessage: 'You cannot upload more than 6 images.'
            });
        }
        if (deletedImages && Array.isArray(deletedImages)) {
            deletedImages.forEach(image => {
                const index = product.image.indexOf(image);
                if (index > -1) {
                    product.image.splice(index, 1);
                }
            });
        }
        if (imageFiles && imageFiles.length > 0) {
            product.image = product.image.concat(imageFiles.map(file => file.filename));
        }

        await product.save();
        return res.redirect('/admin/productmanagement');
    } catch (error) {
        console.error("Error while updating product:", error);
        return res.status(500).send(error.message);
    }
};

const blockProductPost = async (req, res) => {
    try {
        const productID = req.params._id;
        const product = await Product.updateOne({ _id: productID }, { $set: { isBlocked: true } })

        res.redirect("/admin/productmanagement")
    } catch (error) {
        console.error("error in block", error)
        return res.status(500).send(error.message);
    }
};

const unblockProductPost = async (req, res) => {
    try {
        const productID = req.params._id;
        const product = await Product.updateOne({ _id: productID }, { $set: { isBlocked: false } })

        res.redirect("/admin/productmanagement")
    } catch (error) {
        console.error("error in block", error);
        return res.status(500).send(error.message);
    }
};

module.exports = {

    productManagement,
    addProduct,
    editProduct,
    addProductPost,
    editProductPost,
    blockProductPost,
    unblockProductPost,

}