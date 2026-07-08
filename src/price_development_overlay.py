#!/usr/bin/env python3
"""
Price Development Overlay Script

Plots price against days in advance (journey date - offer date) for each journey.
Overlays multiple journeys on the same plot to visualize price development patterns.
"""

import sqlite3
import os
from datetime import datetime
from zoneinfo import ZoneInfo
import textwrap
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.dates import DateFormatter
import pandas as pd

offers_start = datetime(2026, 6, 4, 0, 0, 0, tzinfo=ZoneInfo('Europe/Berlin'))
offers_end = datetime(2026, 7, 5, 23, 59, 59, tzinfo=ZoneInfo('Europe/Berlin'))
route_id = 1

def get_database_path():
    """Get the database path from environment variable or use default."""
    db_path = os.getenv('DB_PATH', './data/price_data.db')
    if not os.path.exists(db_path):
        raise FileNotFoundError(f"Database not found at {db_path}. Set DB_PATH environment variable or place database at ./data/bahn_prices.db")
    return db_path

def load_price_data(db_path):
    """Load offers and journeys data from SQLite database."""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row

    query = f"""
    SELECT
        o.name as origin_name,
        d.name as destination_name
    FROM routes r
    JOIN stations o ON r.origin = o.id
    JOIN stations d ON r.destination = d.id
    WHERE r.id = {route_id}
    """

    (origin_name, destination_name) = conn.execute(query).fetchone()
    
    query = f"""
    SELECT 
        o.journey,
        o.date as offer_date,
        o.price,
        o.currency,
        j.departure as journey_date
    FROM offers o
    JOIN journeys j ON o.journey = j.id
    WHERE o.price IS NOT NULL
        AND j.route = {route_id}
        AND {offers_start.timestamp()} <= o.date
        AND o.date <= {offers_end.timestamp()}
    ORDER BY o.journey, o.date
    """
    
    df = pd.read_sql_query(query, conn)
    conn.close()

    df.attrs['origin_name'] = origin_name
    df.attrs['destination_name'] = destination_name

    return df

def prepare_plot_data(df):
    """Prepare data for plotting by calculating days in advance."""
    df['offer_date'] = pd.to_datetime(df['offer_date'], unit='s')
    df['journey_date'] = pd.to_datetime(df['journey_date'], unit='s')
    
    # Calculate days in advance
    df['days_in_advance'] = (df['journey_date'] - df['offer_date']).dt.days
    
    return df

def plot_price_development(df):
    """Plot price development for each journey."""
    # Get unique journeys
    journeys = df['journey'].unique()
    
    fig, ax = plt.subplots(figsize=(14, 8))
    
    # Plot each journey
    for journey_id in journeys:
        journey_data = df[df['journey'] == journey_id].sort_values('days_in_advance')
        
        if len(journey_data) > 0:
            ax.plot(
                journey_data['days_in_advance'],
                journey_data['price'],
                linestyle='-',
                alpha=0.1,
            )
    
    # Customize plot
    ax.set_xlabel('Days in Advance', fontsize=12)
    ax.set_ylabel('Price (€)', fontsize=12)
    ax.set_title('Price Development Over Time for Multiple Journeys', fontsize=14, fontweight='bold')
    ax.grid(True, alpha=0.3)
    info_text = f'''
        Total offers: {len(df)}
        between {df['offer_date'].min().date()} and {df['offer_date'].max().date()}
        Total journeys: {df['journey'].nunique()}
        from {df.attrs['origin_name']} to {df.attrs['destination_name']}
    '''
    extra_info = mpatches.Patch(color='none', label=textwrap.dedent(info_text).strip())
    ax.legend(handles=[extra_info], handlelength=0, handletextpad=0, borderpad=.8)

    plt.tight_layout()
    
    return fig, ax

def main():
    try:
        print("Loading data from database...")
        db_path = get_database_path()
        df = load_price_data(db_path)
        
        if df.empty:
            print("No price data found in database.")
            return
        
        print(f"Loaded {len(df)} price observations for {df['journey'].nunique()} journeys")
        
        print("Preparing data for visualization...")
        df = prepare_plot_data(df)
        
        print("Creating plot...")
        fig, ax = plot_price_development(df)
        
        # Save plot
        output_path = f'./plots/price_development_route{route_id}_{offers_start.date()}_{offers_end.date()}.png'
        plt.savefig(output_path, dpi=300, bbox_inches='tight')
        print(f"Plot saved to {output_path}")
        
        # Display plot
        plt.show()
        
        # Print summary statistics
        print("\n=== Summary Statistics ===")
        print(f"Total journeys: {df['journey'].nunique()}")
        print(f"Total price observations: {len(df)}")
        print(f"Price range: €{df['price'].min():.2f} - €{df['price'].max():.2f}")
        print(f"Days in advance range: {df['days_in_advance'].min()} to {df['days_in_advance'].max()} days")
        
    except FileNotFoundError as e:
        print(f"Error: {e}")
        return 1
    except Exception as e:
        print(f"Error: {e}")
        return 1
    
    return 0

if __name__ == '__main__':
    exit(main())
