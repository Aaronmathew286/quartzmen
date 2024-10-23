const Order = require("../../models/order");
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');


const salesReport = async (req, res) => {
    try {
        const { type, startDate, endDate, page = 1, limit = 12 } = req.query;
        let query = {};
        const skip = (page - 1) * limit;

        if (type === 'daily') {
            query.createdAt = { $gte: new Date().setHours(0, 0, 0, 0) };
        } else if (type === 'weekly') {
            const weekStart = new Date();
            weekStart.setDate(weekStart.getDate() - 7);
            query.createdAt = { $gte: weekStart };
        } else if (type === 'monthly') {
            const monthStart = new Date();
            monthStart.setMonth(monthStart.getMonth() - 1);
            query.createdAt = { $gte: monthStart };
        } else if (type === 'custom' && startDate && endDate) {
            query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }
        query['products.productStatus'] = { $in: ['Delivered', 'Pending', 'Shipped', 'Rejected'] };

        const orders = await Order.find(query).skip(skip).limit(Number(limit));
        const totalOrders = await Order.countDocuments(query);
        const totalSalesCount = orders.length;
        const totalOrderAmount = orders.reduce((sum, order) => sum + order.totalAmount, 0);
        const totalDiscount = orders.reduce((sum, order) => sum + (order.coupon ? order.coupon.discount : 0), 0);
        const totalPages = Math.ceil(totalOrders / limit);

        res.render('admin/salesreport', {
            type,
            startDate,
            endDate,
            totalSalesCount,
            totalOrderAmount,
            totalDiscount,
            orders,
            currentPage: Number(page),
            totalPages,
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

const generatePDF = async (req, res) => {
    try {
        const { type, startDate, endDate } = req.query;
        const query = {};

        if (type === 'custom' && startDate && endDate) {
            query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
        } else if (type) {
            const today = new Date();
            if (type === 'daily') {
                query.createdAt = { $gte: new Date(today.setHours(0, 0, 0, 0)) };
            } else if (type === 'weekly') {
                const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
                query.createdAt = { $gte: new Date(startOfWeek.setHours(0, 0, 0, 0)) };
            } else if (type === 'monthly') {
                const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                query.createdAt = { $gte: new Date(startOfMonth.setHours(0, 0, 0, 0)) };
            }
        }
        const orders = await Order.find(query);
        const doc = new PDFDocument({ size: 'A4', margin: 30, layout: 'landscape' });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="sales_report.pdf"');

        doc.pipe(res);
        doc.fontSize(18).fillColor('#333').text('Sales Report', { align: 'center', underline: true });
        doc.moveDown(1);
        doc.fontSize(12).fillColor('#333')
            .text(`Total Sales Count: ${orders.length}`, { align: 'left' })
            .text(`Total Order Amount: Rs ${orders.reduce((sum, order) => sum + order.totalAmount, 0).toFixed(2)}`, { align: 'left' })
            .text(`Total Discount: Rs ${orders.reduce((sum, order) => sum + (order.coupon ? order.coupon.discount : 0), 0).toFixed(2)}`, { align: 'left' });
        doc.moveDown(1);


        const tableHeaders = ['Order ID', 'Order Date', 'Total Amount', 'Discount', 'Coupon'];
        const columnWidths = [100, 100, 100, 100, 100]; 
        const tableWidth = columnWidths.reduce((sum, width) => sum + width, 0); 
        const startX = (doc.page.width - tableWidth) / 2; 
        let y = doc.y + 20;

        doc.fontSize(10).fillColor('white').rect(startX, y - 10, tableWidth, 20).fill('#3f51b5'); 
        tableHeaders.forEach((header, i) => {
            doc.fillColor('white').text(header, startX + i * columnWidths[i], y, {
                width: columnWidths[i],
                align: 'center'
            });
        });

        doc.moveTo(startX, y + 10).lineTo(startX + tableWidth, y + 10).stroke();
        doc.fillColor('black');
        y += 20;
        const maxRowsPerPage = 15; 
        orders.forEach((order, index) => {
            if (index > 0 && index % maxRowsPerPage === 0) {
                doc.addPage(); 
                y = 50; 
            }

            const rowY = y + (index % maxRowsPerPage) * 20;
            const rowData = [
                order._id.toString().slice(-6),
                new Date(order.createdAt).toLocaleDateString(),
                `Rs ${order.totalAmount.toFixed(2)}`,
                `Rs ${order.coupon && order.coupon.discount ? order.coupon.discount.toFixed(2) : '0.00'}`,
                order.coupon ? order.coupon.couponCode : 'N/A'
            ];

            rowData.forEach((value, i) => {
                doc.text(value, startX + i * columnWidths[i], rowY, {
                    width: columnWidths[i],
                    align: 'center'
                });
                doc.moveTo(startX + i * columnWidths[i], rowY - 10)
                    .lineTo(startX + i * columnWidths[i], rowY + 10)
                    .stroke();
            });
            doc.moveTo(startX, rowY + 10).lineTo(startX + tableWidth, rowY + 10).stroke();
            doc.moveTo(startX + tableWidth, rowY - 10)
                .lineTo(startX + tableWidth, rowY + 10)
                .stroke();
        });
        doc.end();
    } catch (err) {
        console.error(err);
        res.status(500).send('Error generating PDF');
    }
};



const generateExcel = async (req, res) => {
    try {
        const { type, startDate, endDate } = req.query;
        const query = {};

        if (type === 'custom' && startDate && endDate) {
            query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
        } else if (type) {
            const today = new Date();
            if (type === 'daily') {
                query.createdAt = { $gte: new Date(today.setHours(0, 0, 0, 0)) };
            } else if (type === 'weekly') {
                const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
                query.createdAt = { $gte: new Date(startOfWeek.setHours(0, 0, 0, 0)) };
            } else if (type === 'monthly') {
                const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                query.createdAt = { $gte: new Date(startOfMonth.setHours(0, 0, 0, 0)) };
            }
        }

        const orders = await Order.find(query);
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');

        worksheet.columns = [
            { header: 'Order ID', key: '_id', width: 30 },
            { header: 'Order Date', key: 'createdAt', width: 20 },
            { header: 'Total Amount', key: 'totalAmount', width: 20 },
            { header: 'Discount', key: 'discount', width: 20 },
            { header: 'Coupon', key: 'coupon', width: 20 },
        ];

        orders.forEach(order => {
            worksheet.addRow({
                _id: order._id,
                createdAt: new Date(order.createdAt).toLocaleDateString(),
                totalAmount: order.totalAmount.toFixed(2),
                discount: order.coupon && order.coupon.discount ? order.coupon.discount.toFixed(2) : '0.00',
                coupon: order.coupon ? order.coupon.couponCode : 'N/A',
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="sales_report.xlsx"');

        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error(err);
        res.status(500).send('Error generating Excel report');
    }
};

module.exports = {
    salesReport,
    generatePDF,
    generateExcel
};