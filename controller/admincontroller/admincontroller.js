const Order  = require('../../models/order')
const User = require("../../models/user")
const Product = require("../../models/product")

const login = (req,res)=>{
    
    if(!req.session.admin){
        res.render("admin/login")
    }else{
        res.redirect('/admin/dashboard')
    }
}

const loginpost = async(req,res) =>{

    const {username,password} = req.body

    if(username == process.env.ADMINMAIL && password == process.env.ADMINPASSWORD){
        req.session.admin = req.body.username;
        adminsession = req.session.admin;

        res.redirect("/admin/dashboard")

    }else if(username == process.env.ADMINMAIL && password !== process.env.ADMINPASSWORD){
        res.render("admin/login",{status:true,errMessage:"Invalid password,Retry..."})
    }
    else if(username !== process.env.ADMINMAIL && password !== process.env.ADMINPASSWORD){
        res.render("admin/login",{status:true,errMessage:"Invalid Details,Retry..."})
    }
    else{
        res.render("admin/login");
    }
}

const dashboard = async (req, res) => {
    try {

      const totalOrders = await Order.countDocuments();
      const totalUsers = await User.countDocuments();
      const totalProducts = await Product.countDocuments();
      const totalIncomeData = await Order.aggregate([
        {
          $match: {
            paymentStatus: { $ne: 'Failed' },
            'products.productStatus': { $nin: ['Cancel', 'Return', 'Accepted'] }
          }
        },
        {
          $project: {
            effectiveAmount: {
              $sum: {
                $map: {
                  input: "$products",
                  as: "product",
                  in: {
                    $cond: [
                      { $in: ["$$product.productStatus", ["Cancel", "Return", "Accepted"]] },
                      0,
                      "$$product.totalPrice"
                    ]
                  }
                }
              }
            }
          }
        },
        {
          $group: {
            _id: null,
            totalIncome: { $sum: "$effectiveAmount" }
          }
        }
      ]);
  
      const totalIncome = totalIncomeData[0] ? totalIncomeData[0].totalIncome : 0;
      res.render('admin/dashboard', { totalIncome, totalOrders, totalProducts, totalUsers });
    } catch (error) {
      console.error("Error fetching dashboard stats: ", error);
      res.status(500).send("Internal error happened in the dashboard");
    }
};
  
const orderTrend = async (req, res) => {
        const { filter } = req.query;
        const today = new Date();
        let startDate, endDate, groupFormat;

        startDate = new Date();
        endDate = new Date();
      
        switch (filter) {
          case 'daily':
            startDate = new Date(today.setDate(today.getDate() - 6)); 
            endDate = new Date();
            groupFormat = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }; 
            break;
          case 'weekly':
            startDate = new Date(today.setDate(today.getDate() - 30));
            endDate = new Date();
            groupFormat = {
              $concat: [
                { $toString: { $isoWeekYear: "$createdAt" } },
                "-W",
                { $toString: { $isoWeek: "$createdAt" } }
              ],
            };
            break;
          case 'monthly':
            startDate = new Date(today.getFullYear(), 0, 1); 
            endDate = new Date(today.getFullYear(), 11, 31); 
            groupFormat = { $month: "$createdAt" };
            break;
          case 'yearly':
            startDate = new Date(today.getFullYear() - 3, 0, 1); 
            endDate = new Date(today.getFullYear(), 11, 31); 
            groupFormat = { $year: "$createdAt" };
            break;
          default:
            return res.status(400).json({ message: 'Invalid filter' });
        }
      
        try {

          const orderStats = await Order.aggregate([
            {
              $match: {
                createdAt: { $gte: startDate, $lte: endDate },
              },
            },
            {
              $group: {
                _id: groupFormat,
                orderCount: { $sum: 1 },
              },
            },
            {
              $sort: { _id: 1 }, 
            },
          ]);
          const formattedData = formatOrderData(orderStats, filter);
          res.json({ orderCount: formattedData });
        } catch (error) {
          console.error('Error fetching order stats:', error);
          res.status(500).json({ message: 'Server error' });
        }
};
      
function formatOrderData(orderStats, filter) {
        let labels = [];
        let dataValues = [];
      
        switch (filter) {
          case 'daily':
            labels = Array.from({ length: 7 }, (_, i) => {
              const date = new Date();
              date.setDate(date.getDate() - (6 - i));
              return date.toISOString().split('T')[0]; 
            });
            dataValues = Array(7).fill(0);
            break;
          case 'weekly':
            labels = getLastFourWeeks(); 
            dataValues = Array(4).fill(0);
            break;
          case 'monthly':
            labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            dataValues = Array(12).fill(0);
            break;
          case 'yearly':
            labels = ['2021', '2022', '2023', '2024'];
            dataValues = Array(4).fill(0);
            break;
          default:
            return [];
        }

        orderStats.forEach(stat => {
          let index;
          switch (filter) {
            case 'daily':
              index = labels.indexOf(stat._id);
              break;
            case 'weekly':
              index = labels.indexOf(stat._id); 
              break;
            case 'monthly':
              index = stat._id - 1; 
              break;
            case 'yearly':
              index = labels.indexOf(stat._id.toString());
              break;
          }
          if (index >= 0 && index < dataValues.length) {
            dataValues[index] = stat.orderCount;
          }
        });
      
        return dataValues;
}

function getLastFourWeeks() {
        const weeks = [];
        const today = new Date();
        for (let i = 0; i < 4; i++) {
          const weekDate = new Date(today);
          weekDate.setDate(today.getDate() - today.getDay() - 7 * i); 
          const isoWeekYear = weekDate.getISOWeekYear(); 
          const isoWeek = weekDate.getISOWeek(); 
          weeks.unshift(`${isoWeekYear}-W${isoWeek}`);
        }
        return weeks;
}

Date.prototype.getISOWeekYear = function () {
        const date = new Date(this.getFullYear(), this.getMonth(), this.getDate());
        const dayOfWeek = date.getDay() || 7;
        date.setDate(date.getDate() + 4 - dayOfWeek);
        return date.getFullYear();
};
      
Date.prototype.getISOWeek = function () {
        const date = new Date(this.getFullYear(), this.getMonth(), this.getDate());
        const dayOfWeek = date.getDay() || 7;
        date.setDate(date.getDate() + 4 - dayOfWeek);
        const startOfYear = new Date(date.getFullYear(), 0, 1);
        const weekNumber = Math.ceil(((date - startOfYear) / 86400000 + 1) / 7);
        return weekNumber;
};

const orderTop = async(req,res) => {
    try {

        const topProducts = await Order.aggregate([
          { $unwind: '$products' },
          {
            $group: {
              _id: '$products.product',
              totalQuantity: { $sum: '$products.quantity' },
              totalSales: { $sum: '$products.totalPrice' }
            }
          },
          {
            $lookup: {
              from: 'products',
              localField: '_id',
              foreignField: '_id',
              as: 'productDetails'
            }
          },
          { $unwind: '$productDetails' },
          { $sort: { totalQuantity: -1 } },
          { $limit: 5 }
        ]);

        const topBrands = await Order.aggregate([
          { $unwind: '$products' },
          {
            $lookup: {
              from: 'products',
              localField: 'products.product',
              foreignField: '_id',
              as: 'productDetails'
            }
          },
          { $unwind: '$productDetails' },
          {
            $group: {
              _id: '$productDetails.brand', 
              totalSales: { $sum: '$products.totalPrice' },
              totalQuantity: { $sum: '$products.quantity' }
            }
          },
          { $sort: { totalQuantity: -1 } },
          { $limit: 5 }
        ]);

        const topCategories = await Order.aggregate([
          { $unwind: '$products' },
          {
            $lookup: {
              from: 'products',
              localField: 'products.product',
              foreignField: '_id',
              as: 'productDetails'
            }
          },
          { $unwind: '$productDetails' },
          {
            $group: {
              _id: '$productDetails.category',
              totalSales: { $sum: '$products.totalPrice' },
              totalQuantity: { $sum: '$products.quantity' }
            }
          },
          { $sort: { totalQuantity: -1 } },
          { $limit: 5 }
        ]);
    
        res.status(200).json({
          topProducts,
          topBrands,
          topCategories
        });
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        res.status(500).send('Internal Server Error');
      }
};

const logout = (req,res) =>{
    req.session.admin = false
    res.redirect("/admin/login")
}

module.exports = {

    login,
    loginpost,
    dashboard,
    logout,
    orderTrend,
    orderTop

}