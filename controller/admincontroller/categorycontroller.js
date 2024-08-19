const User = require("../../models/user")
const Product = require("../../models/product")
const Category = require("../../models/category")



const categorymanagement = async(req,res) =>{

    try{
        const categoryData =await Category.find()
        res.render('admin/categorymanagement',{category:categoryData})
    }
    catch(error){
        console.error("Error during category getting:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

const addcategory = (req,res) =>{
    res.render("admin/addcategory")
}

const addcategorypost = async (req, res) => {
    try {
        const { name,description } = req.body;
        const lowercaseCategory = name.trim().toLowerCase();

        const existingCategory = await Category.findOne({ categoryName: lowercaseCategory });

        if (!existingCategory) {
            const newCategory = new Category({
                categoryName: lowercaseCategory,
                description: description, 
                isBlocked: false
            });

            await newCategory.save();

            console.log("New category successfully added:", newCategory);
            res.redirect("/admin/categorymanagement")
        } else {
            console.log("Category already exists");
            res.render("admin/category",{errMessage:"Category already exists"})
        }
    } catch (error) {
        console.error("Error during adding:", error);
        res.status(500).send("Internal server error");
    }
};

const editcategory = async (req, res) => {
    console.log("edit category works");
    try {
        const id = req.params._id;
        console.log(id);
        const { categoryName, description } = req.body; 
        const categoryEdit = await Category.findById(id);

        if (categoryEdit) {
 
            categoryEdit.categoryName = categoryName || categoryEdit.categoryName; 
            categoryEdit.description = description || categoryEdit.description;
            await categoryEdit.save();
        }
        res.render("admin/editcategory", { categoryEdit: categoryEdit, errMessage: "error" });
    } catch (error) {
        console.log(error);
        res.status(500).send("An error occurred while editing the category."); 
    }
};



const editcategorypost = async (req, res) => {
    try {
        const id = req.params._id;
        console.log(id);
        const newCategoryEdit = req.body.categoryName;
        console.log(newCategoryEdit);

        const categoryToEdit = await Category.findById(id);
        if (!categoryToEdit) {
            return res.status(404).send("Category not found");
        }

        categoryToEdit.name = newCategoryEdit; 
        await categoryToEdit.save();

        res.redirect("/admin/categorymanagement");
    } catch (error) {
        console.log(error);
        res.status(500).send("Internal Server Error");
    }
};

const blockcategorypost = async (req, res) => {
    try{
        const categoryID = req.params._id;
        console.log(categoryID);
        const product = await Category.updateOne({_id : categoryID},{$set : {isBlocked:true}})
        console.log(product)
        res.redirect("/admin/categorymanagement")
    }catch(error){
        console.log("error in block",error)
    }
    
};

const unblockcategorypost = async (req, res) => {
    try{
        const productID = req.params._id;
        console.log(productID);
        const product = await Category.updateOne({_id : productID},{$set : {isBlocked:false}})
        console.log(product)
        res.redirect("/admin/categorymanagement")
    }catch(error){
        console.log("error in block",error)
    }
    
};

module.exports = {

    categorymanagement,
    addcategory,
    editcategory,
    addcategorypost,
    editcategorypost,
    blockcategorypost,
    unblockcategorypost,

}