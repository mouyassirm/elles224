"""
Reports and dashboard router
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta
import io
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from datetime import datetime, timedelta
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from database import get_db
from schemas import DashboardData, StockSummary, FinancialSummary
from services import ReportService, StockService, FinanceService

router = APIRouter()

def create_monthly_sales_chart(sales_data, start_date, end_date):
    """Create a monthly sales histogram chart"""
    try:
        # Group sales by month
        monthly_data = {}
        for sale in sales_data:
            sale_date = sale.date
            month_key = sale_date.strftime('%Y-%m')
            if month_key not in monthly_data:
                monthly_data[month_key] = 0
            monthly_data[month_key] += sale.total_revenue
        
        # Sort by month
        sorted_months = sorted(monthly_data.keys())
        
        if not sorted_months:
            return None
            
        # Create the chart
        plt.figure(figsize=(10, 6))
        months = [datetime.strptime(month, '%Y-%m').strftime('%b %Y') for month in sorted_months]
        revenues = [monthly_data[month] for month in sorted_months]
        
        bars = plt.bar(months, revenues, color='#3B82F6', alpha=0.8, edgecolor='#1E40AF', linewidth=1)
        
        # Customize the chart
        plt.title('Évolution Mensuelle des Ventes', fontsize=16, fontweight='bold', pad=20)
        plt.xlabel('Mois', fontsize=12, fontweight='bold')
        plt.ylabel('Chiffre d\'affaires (GNF)', fontsize=12, fontweight='bold')
        
        # Rotate x-axis labels for better readability
        plt.xticks(rotation=45, ha='right')
        
        # Add value labels on top of bars
        for bar, revenue in zip(bars, revenues):
            height = bar.get_height()
            plt.text(bar.get_x() + bar.get_width()/2., height + max(revenues)*0.01,
                    f'{revenue:,.0f}', ha='center', va='bottom', fontsize=10, fontweight='bold')
        
        # Format y-axis to show values in thousands
        ax = plt.gca()
        ax.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: f'{x/1000:.0f}K'))
        
        # Add grid for better readability
        plt.grid(axis='y', alpha=0.3, linestyle='--')
        
        # Adjust layout to prevent label cutoff
        plt.tight_layout()
        
        # Save to bytes buffer
        buffer = io.BytesIO()
        plt.savefig(buffer, format='png', dpi=300, bbox_inches='tight')
        buffer.seek(0)
        plt.close()
        
        return buffer
        
    except Exception as e:
        print(f"Error creating chart: {e}")
        return None

def create_revenue_distribution_chart(finances_data):
    """Create a revenue distribution pie chart"""
    try:
        if not finances_data:
            return None
            
        # Calculate total revenue
        total_revenue = sum(f.total_revenue for f in finances_data)
        
        if total_revenue == 0:
            return None
            
        # Create a simple bar chart showing monthly revenue distribution
        monthly_data = {}
        for finance in finances_data:
            month_key = finance.date.strftime('%Y-%m')
            if month_key not in monthly_data:
                monthly_data[month_key] = 0
            monthly_data[month_key] += finance.total_revenue
        
        # Sort by month
        sorted_months = sorted(monthly_data.keys())
        
        if not sorted_months:
            return None
            
        # Create the chart
        plt.figure(figsize=(10, 6))
        months = [datetime.strptime(month, '%Y-%m').strftime('%b %Y') for month in sorted_months]
        revenues = [monthly_data[month] for month in sorted_months]
        
        bars = plt.bar(months, revenues, color='#10B981', alpha=0.8, edgecolor='#047857', linewidth=1)
        
        # Customize the chart
        plt.title('Répartition des Revenus par Mois', fontsize=16, fontweight='bold', pad=20)
        plt.xlabel('Mois', fontsize=12, fontweight='bold')
        plt.ylabel('Revenus (GNF)', fontsize=12, fontweight='bold')
        
        # Rotate x-axis labels for better readability
        plt.xticks(rotation=45, ha='right')
        
        # Add value labels on top of bars
        for bar, revenue in zip(bars, revenues):
            height = bar.get_height()
            plt.text(bar.get_x() + bar.get_width()/2., height + max(revenues)*0.01,
                    f'{revenue:,.0f}', ha='center', va='bottom', fontsize=10, fontweight='bold')
        
        # Format y-axis to show values in thousands
        ax = plt.gca()
        ax.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: f'{x/1000:.0f}K'))
        
        # Add grid for better readability
        plt.grid(axis='y', alpha=0.3, linestyle='--')
        
        # Adjust layout to prevent label cutoff
        plt.tight_layout()
        
        # Save to bytes buffer
        buffer = io.BytesIO()
        plt.savefig(buffer, format='png', dpi=300, bbox_inches='tight')
        buffer.seek(0)
        plt.close()
        
        return buffer
        
    except Exception as e:
        print(f"Error creating revenue chart: {e}")
        return None

def create_stock_value_chart(stocks_data):
    """Create a stock value distribution chart"""
    try:
        if not stocks_data:
            return None
            
        # Get top 10 most valuable items
        sorted_stocks = sorted(stocks_data, key=lambda x: x.total_value, reverse=True)[:10]
        
        if not sorted_stocks:
            return None
            
        # Create the chart
        plt.figure(figsize=(12, 6))
        item_names = [stock.name[:20] + '...' if len(stock.name) > 20 else stock.name for stock in sorted_stocks]
        values = [stock.total_value for stock in sorted_stocks]
        
        bars = plt.bar(range(len(item_names)), values, color='#8B5CF6', alpha=0.8, edgecolor='#7C3AED', linewidth=1)
        
        # Customize the chart
        plt.title('Top 10 Articles par Valeur de Stock', fontsize=16, fontweight='bold', pad=20)
        plt.xlabel('Articles', fontsize=12, fontweight='bold')
        plt.ylabel('Valeur (GNF)', fontsize=12, fontweight='bold')
        
        # Set x-axis labels
        plt.xticks(range(len(item_names)), item_names, rotation=45, ha='right')
        
        # Add value labels on top of bars
        for bar, value in zip(bars, values):
            height = bar.get_height()
            plt.text(bar.get_x() + bar.get_width()/2., height + max(values)*0.01,
                    f'{value:,.0f}', ha='center', va='bottom', fontsize=9, fontweight='bold')
        
        # Format y-axis to show values in thousands
        ax = plt.gca()
        ax.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: f'{x/1000:.0f}K'))
        
        # Add grid for better readability
        plt.grid(axis='y', alpha=0.3, linestyle='--')
        
        # Adjust layout to prevent label cutoff
        plt.tight_layout()
        
        # Save to bytes buffer
        buffer = io.BytesIO()
        plt.savefig(buffer, format='png', dpi=300, bbox_inches='tight')
        buffer.seek(0)
        plt.close()
        
        return buffer
        
    except Exception as e:
        print(f"Error creating stock chart: {e}")
        return None

@router.get("/dashboard", response_model=DashboardData)
async def get_dashboard_data(db: Session = Depends(get_db)):
    """Get complete dashboard data"""
    try:
        dashboard_data = ReportService.get_dashboard_data(db)
        return dashboard_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating dashboard: {str(e)}")

@router.get("/stock/summary", response_model=StockSummary)
async def get_stock_summary(db: Session = Depends(get_db)):
    """Get stock summary statistics"""
    try:
        summary = ReportService.get_stock_summary(db)
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating stock summary: {str(e)}")

@router.get("/finance/summary", response_model=FinancialSummary)
async def get_financial_summary(db: Session = Depends(get_db)):
    """Get financial summary statistics"""
    try:
        summary = ReportService.get_financial_summary(db)
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating financial summary: {str(e)}")

@router.get("/stock/value-distribution")
async def get_stock_value_distribution(db: Session = Depends(get_db)):
    """Get stock value distribution for charts"""
    from database import Stock
    from sqlalchemy import func
    
    # Get stock items with their values
    stock_values = db.query(
        Stock.name,
        Stock.total_value
    ).filter(
        Stock.total_value > 0
    ).order_by(
        Stock.total_value.desc()
    ).all()
    
    return {
        "labels": [item.name for item in stock_values],
        "values": [float(item.total_value) for item in stock_values]
    }

@router.get("/sales/trend")
async def get_sales_trend(
    period: str = Query("month", description="Period: week, month, year"),
    db: Session = Depends(get_db)
):
    """Get sales trend data for charts"""
    from database import Finance
    from sqlalchemy import func, extract
    from datetime import datetime, timedelta
    
    now = datetime.utcnow()
    
    if period == "week":
        # Last 4 weeks
        data_points = []
        for i in range(4):
            week_start = now - timedelta(weeks=i+1)
            week_end = week_start + timedelta(weeks=1)
            
            revenue = db.query(func.sum(Finance.total_revenue)).filter(
                Finance.date >= week_start,
                Finance.date < week_end
            ).scalar() or 0.0
            
            data_points.append({
                "period": f"Week {4-i}",
                "revenue": float(revenue)
            })
        
        return {"trend_data": list(reversed(data_points))}
    
    elif period == "month":
        # Last 6 months
        data_points = []
        for i in range(6):
            month = now.month - i - 1
            year = now.year
            if month <= 0:
                month += 12
                year -= 1
            
            revenue = db.query(func.sum(Finance.total_revenue)).filter(
                extract('year', Finance.date) == year,
                extract('month', Finance.date) == month
            ).scalar() or 0.0
            
            data_points.append({
                "period": f"{year}-{month:02d}",
                "revenue": float(revenue)
            })
        
        return {"trend_data": list(reversed(data_points))}
    
    elif period == "year":
        # Last 5 years
        data_points = []
        for i in range(5):
            year = now.year - i - 1
            
            revenue = db.query(func.sum(Finance.total_revenue)).filter(
                extract('year', Finance.date) == year
            ).scalar() or 0.0
            
            data_points.append({
                "period": str(year),
                "revenue": float(revenue)
            })
        
        return {"trend_data": list(reversed(data_points))}
    
    else:
        raise HTTPException(
            status_code=400,
            detail="Period must be 'week', 'month', or 'year'"
        )

@router.get("/stock/quantity-alerts")
async def get_quantity_alerts(
    threshold: int = Query(10, ge=1, description="Low stock threshold"),
    db: Session = Depends(get_db)
):
    """Get stock items with low quantity"""
    low_stock = StockService.get_all_stock(db, limit=1000)  # Get all to filter
    alerts = [item for item in low_stock if item.quantity < threshold]
    
    return {
        "threshold": threshold,
        "alert_count": len(alerts),
        "items": [
            {
                "id": item.id,
                "reference": item.reference,
                "name": item.name,
                "quantity": item.quantity,
                "unit_price": item.unit_price
            }
            for item in alerts
        ]
    }

@router.get("/performance/metrics")
async def get_performance_metrics(db: Session = Depends(get_db)):
    """Get key performance metrics"""
    from database import Stock, Finance, Movement
    from sqlalchemy import func
    from datetime import datetime, timedelta
    
    now = datetime.utcnow()
    last_month = now - timedelta(days=30)
    
    # Total stock value
    total_stock_value = db.query(func.sum(Stock.total_value)).scalar() or 0.0
    
    # Monthly revenue
    monthly_revenue = db.query(func.sum(Finance.total_revenue)).filter(
        Finance.date >= last_month
    ).scalar() or 0.0
    
    # Monthly movements
    monthly_movements = db.query(func.count(Movement.id)).filter(
        Movement.date >= last_month
    ).scalar() or 0
    
    # Average discount
    avg_discount = db.query(func.avg(Finance.discount_percent)).scalar() or 0.0
    
    # Stock turnover (items sold this month / total stock)
    items_sold_month = db.query(func.sum(Finance.quantity_sold)).filter(
        Finance.date >= last_month
    ).scalar() or 0
    
    total_stock_quantity = db.query(func.sum(Stock.quantity)).scalar() or 1
    
    turnover_rate = (items_sold_month / total_stock_quantity) * 100 if total_stock_quantity > 0 else 0
    
    return {
        "total_stock_value": float(total_stock_value),
        "monthly_revenue": float(monthly_revenue),
        "monthly_movements": monthly_movements,
        "average_discount": float(avg_discount),
        "stock_turnover_rate": float(turnover_rate),
        "items_sold_this_month": items_sold_month
    }

# PDF Generation endpoints
@router.get("/pdf/stock")
async def generate_stock_pdf(db: Session = Depends(get_db)):
    """Generate stock report PDF"""
    try:
        from database import Stock
        
        # Get stock data
        stocks = db.query(Stock).all()
        
        # Create PDF buffer
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        styles = getSampleStyleSheet()
        
        # Title
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=18,
            spaceAfter=30,
            alignment=1  # Center
        )
        
        title = Paragraph("Rapport de Stock", title_style)
        
        # Date
        date_style = ParagraphStyle(
            'CustomDate',
            parent=styles['Normal'],
            fontSize=10,
            alignment=1
        )
        date_text = Paragraph(f"Généré le {datetime.now().strftime('%d/%m/%Y à %H:%M')}", date_style)
        
        # Stock table
        table_data = [['Article', 'Quantité', 'Prix Unitaire', 'Valeur Totale']]
        
        total_value = 0
        for stock in stocks:
            table_data.append([
                stock.name,
                str(stock.quantity),
                f"{stock.unit_price:,.0f} GNF",
                f"{stock.total_value:,.0f} GNF"
            ])
            total_value += stock.total_value
        
        # Add total row
        table_data.append(['TOTAL', '', '', f"{total_value:,.0f} GNF"])
        
        stock_table = Table(table_data)
        stock_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -2), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('BACKGROUND', (0, -1), (-1, -1), colors.lightgrey),
        ]))
        
        # Create stock value chart
        chart_buffer = create_stock_value_chart(stocks)
        
        # Build PDF elements
        elements = [title, Spacer(1, 12), date_text, Spacer(1, 20), stock_table]
        
        # Add chart if available
        if chart_buffer:
            elements.append(Spacer(1, 20))
            chart_image = Image(chart_buffer, width=6*inch, height=3.6*inch)
            elements.append(chart_image)
        
        doc.build(elements)
        
        buffer.seek(0)
        
        return StreamingResponse(
            io.BytesIO(buffer.read()),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=rapport_stock_{datetime.now().strftime('%Y%m%d_%H%M')}.pdf"}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating stock PDF: {str(e)}")

@router.get("/pdf/sales")
async def generate_sales_pdf(
    period: str = Query("month", description="Period: week, month, 3months, 6months, 9months, year, custom"),
    start_date: str = Query(None, description="Start date for custom period (YYYY-MM-DD)"),
    end_date: str = Query(None, description="End date for custom period (YYYY-MM-DD)"),
    db: Session = Depends(get_db)
):
    """Generate sales report PDF"""
    try:
        from database import Finance, Movement
        
        # Calculate date range
        now = datetime.utcnow()
        if period == "week":
            start_date = now - timedelta(weeks=1)
            period_name = "Semaine dernière"
        elif period == "month":
            start_date = now - timedelta(days=30)
            period_name = "30 derniers jours"
        elif period == "3months":
            start_date = now - timedelta(days=90)
            period_name = "3 derniers mois"
        elif period == "6months":
            start_date = now - timedelta(days=180)
            period_name = "6 derniers mois"
        elif period == "9months":
            start_date = now - timedelta(days=270)
            period_name = "9 derniers mois"
        elif period == "year":
            start_date = now - timedelta(days=365)
            period_name = "Année dernière"
        elif period == "custom" and start_date and end_date:
            try:
                start_date = datetime.strptime(start_date, "%Y-%m-%d")
                end_date = datetime.strptime(end_date, "%Y-%m-%d")
                period_name = f"Du {start_date.strftime('%d/%m/%Y')} au {end_date.strftime('%d/%m/%Y')}"
            except ValueError:
                raise HTTPException(status_code=400, detail="Format de date invalide. Utilisez YYYY-MM-DD")
        else:
            start_date = now - timedelta(days=30)
            period_name = "30 derniers jours"
        
        # Get sales data
        query_sales = db.query(Finance).filter(Finance.date >= start_date)
        query_movements = db.query(Movement).filter(
            Movement.date >= start_date,
            Movement.movement_type == "sale"
        )
        
        # Add end date filter for custom periods
        if period == "custom" and end_date:
            query_sales = query_sales.filter(Finance.date <= end_date)
            query_movements = query_movements.filter(Movement.date <= end_date)
        
        sales = query_sales.all()
        movements = query_movements.all()
        
        # Create PDF buffer
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        styles = getSampleStyleSheet()
        
        # Title
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=18,
            spaceAfter=30,
            alignment=1
        )
        
        title = Paragraph("Rapport de Ventes", title_style)
        
        # Date
        date_style = ParagraphStyle(
            'CustomDate',
            parent=styles['Normal'],
            fontSize=10,
            alignment=1
        )
        date_text = Paragraph(f"Période: {period_name} - Généré le {datetime.now().strftime('%d/%m/%Y à %H:%M')}", date_style)
        
        # Summary
        total_revenue = sum(sale.total_revenue for sale in sales)
        total_quantity = sum(sale.quantity_sold for sale in sales)
        avg_discount = sum(sale.discount_percent for sale in sales) / len(sales) if sales else 0
        
        summary_data = [
            ['Métrique', 'Valeur'],
            ['Chiffre d\'affaires total', f"{total_revenue:,.0f} GNF"],
            ['Quantité vendue', f"{total_quantity} articles"],
            ['Remise moyenne', f"{avg_discount:.1f}%"],
            ['Nombre de ventes', f"{len(movements)} transactions"]
        ]
        
        summary_table = Table(summary_data)
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ]))
        
        # Create monthly sales chart
        chart_buffer = create_monthly_sales_chart(sales, start_date, end_date)
        
        # Build PDF elements
        elements = [title, Spacer(1, 12), date_text, Spacer(1, 20), summary_table]
        
        # Add chart if available
        if chart_buffer:
            elements.append(Spacer(1, 20))
            chart_image = Image(chart_buffer, width=6*inch, height=3.6*inch)
            elements.append(chart_image)
        
        doc.build(elements)
        
        buffer.seek(0)
        
        return StreamingResponse(
            io.BytesIO(buffer.read()),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=rapport_ventes_{period}_{datetime.now().strftime('%Y%m%d_%H%M')}.pdf"}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating sales PDF: {str(e)}")

@router.get("/pdf/financial")
async def generate_financial_pdf(db: Session = Depends(get_db)):
    """Generate financial report PDF"""
    try:
        from database import Finance, Stock
        
        # Get financial data
        finances = db.query(Finance).all()
        stocks = db.query(Stock).all()
        
        # Calculate metrics
        total_revenue = sum(f.total_revenue for f in finances)
        total_stock_value = sum(s.total_value for s in stocks)
        avg_discount = sum(f.discount_percent for f in finances) / len(finances) if finances else 0
        
        # Create PDF buffer
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        styles = getSampleStyleSheet()
        
        # Title
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=18,
            spaceAfter=30,
            alignment=1
        )
        
        title = Paragraph("Rapport Financier", title_style)
        
        # Date
        date_style = ParagraphStyle(
            'CustomDate',
            parent=styles['Normal'],
            fontSize=10,
            alignment=1
        )
        date_text = Paragraph(f"Généré le {datetime.now().strftime('%d/%m/%Y à %H:%M')}", date_style)
        
        # Financial summary
        financial_data = [
            ['Métrique Financière', 'Valeur'],
            ['Chiffre d\'affaires total', f"{total_revenue:,.0f} GNF"],
            ['Valeur du stock', f"{total_stock_value:,.0f} GNF"],
            ['Remise moyenne', f"{avg_discount:.1f}%"],
            ['Nombre de transactions', f"{len(finances)}"]
        ]
        
        financial_table = Table(financial_data)
        financial_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ]))
        
        # Create revenue distribution chart
        chart_buffer = create_revenue_distribution_chart(finances)
        
        # Build PDF elements
        elements = [title, Spacer(1, 12), date_text, Spacer(1, 20), financial_table]
        
        # Add chart if available
        if chart_buffer:
            elements.append(Spacer(1, 20))
            chart_image = Image(chart_buffer, width=6*inch, height=3.6*inch)
            elements.append(chart_image)
        
        doc.build(elements)
        
        buffer.seek(0)
        
        return StreamingResponse(
            io.BytesIO(buffer.read()),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=rapport_financier_{datetime.now().strftime('%Y%m%d_%H%M')}.pdf"}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating financial PDF: {str(e)}")





