const Category = require("../../models/category")

const categoryManagement = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10; 
        const skip = (page - 1) * limit;

        const categoryData = await Category.find().skip(skip).limit(limit);
        const count = await Category.countDocuments(); 

        res.render('admin/categorymanagement', {
            category: categoryData,
            currentPage: page,
            totalPages: Math.ceil(count / limit), 
        });
    } catch (error) {
        console.error("Error during category getting:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

const addCategory = (req, res) => {
    res.render("admin/addcategory")
}

const addCategoryPost = async (req, res) => {
    try {
        const { name, description } = req.body;
        const lowercaseCategory = name.trim().toLowerCase();
        const existingCategory = await Category.findOne({ categoryName: lowercaseCategory });

        if (existingCategory) {
            res.render("admin/addcategory", { errMessage: "The category already exists. Please give another category name." });
        } else if (!existingCategory) {
            const newCategory = new Category({
                categoryName: lowercaseCategory,
                description: description,
                isBlocked: false
            });

            await newCategory.save();
            res.redirect("/admin/categorymanagement")
        }else{
            res.render("admin/addcategory")
        }
    } catch (error) {
        console.error("Error during adding:", error);
        res.status(500).send("Internal server error");
    }
};

const editCategory = async (req, res) => {
    try {
        const id = req.params._id;
        const categoryEdit = await Category.findById(id);

        if(!categoryEdit){
            res.render("admin/categorymanagement",{errMessage: "The category is not found"})
        }
        res.render("admin/editcategory", { categoryEdit: categoryEdit, errMessage: undefined });
    } catch (error) {
        console.error("This is the error",error);
        res.status(500).send("An error occurred while editing the category.");
    }
};

const editCategoryPost = async (req, res) => {
    try {
        const id = req.params._id;
        const { categoryName, description } = req.body; 
        const lowercaseCategory = categoryName.trim().toLowerCase();
        const categoryToEdit = await Category.findById(id);
        if (!categoryToEdit) {
            return res.status(404).send("Category not found");
        }

        categoryToEdit.categoryName = lowercaseCategory 
        categoryToEdit.description = description 
        await categoryToEdit.save();

        res.redirect("/admin/categorymanagement");
    } catch (error) {
        console.error("An error occured:", error);
        res.status(500).send("Internal Server Error");
    }
};

const blockCategoryPost = async (req, res) => {
    try {
        const categoryID = req.params._id;
        const product = await Category.updateOne({ _id: categoryID }, { $set: { isBlocked: true } })
        res.redirect("/admin/categorymanagement")
    } catch (error) {
        console.error("error in block", error)
        res.status(500).send("Internal Server Error");
    }

};

const unblockCategoryPost = async (req, res) => {
    try {
        const productID = req.params._id;
        const product = await Category.updateOne({ _id: productID }, { $set: { isBlocked: false } })

        res.redirect("/admin/categorymanagement")
    } catch (error) {
        console.error("error in block", error)
        res.status(500).send("Internal Server Error");
    }

};

module.exports = {

    categoryManagement,
    addCategory,
    editCategory,
    addCategoryPost,
    editCategoryPost,
    blockCategoryPost,
    unblockCategoryPost,

}