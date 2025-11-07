#!/usr/bin/env python3
"""
Script to generate interesting_individuals.csv from a list of organism IDs.

This script reads the taxonomy.csv file and creates an interesting_individuals.csv
file with the specified organism IDs and their taxonomic information.

Usage:
    python generate_interesting_individuals.py

You can modify the ORGANISM_IDS list in the script to specify which organisms to include.
"""

import csv
import os
import sys
from typing import List, Dict, Optional

# Configuration
TAXONOMY_FILE = 'data/taxonomy.csv'
OUTPUT_FILE = './public/data/interesting_individuals.csv'

# List of organism IDs to include in the interesting individuals file
# You can modify this list to include the organisms you want
ORGANISM_IDS = [
    'GCF_000005845.2_ASM584v2',
    'GCF_000006765.1_ASM676v1', 
    'GCF_000006945.2_ASM694v2',
    'GCF_003030385.1_ASM303038v1',
    'GCF_001399775.1_ASM139977v1',
    'GCF_016127355.1_ASM1612735v1',
    'GCF_011067105.1_ASM1106710v1',
]

def load_taxonomy_data(taxonomy_file: str) -> Dict[str, Dict[str, str]]:
    """
    Load taxonomy data from CSV file and return a dictionary indexed by organism ID.
    
    Args:
        taxonomy_file: Path to the taxonomy CSV file
        
    Returns:
        Dictionary with organism ID as key and taxonomy info as value
    """
    taxonomy_data = {}
    
    try:
        with open(taxonomy_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                organism_id = row['ID']
                if organism_id not in taxonomy_data:
                    # Store the first occurrence of each organism ID
                    taxonomy_data[organism_id] = {
                        'superkingdom': row['Domain'],
                        'phylum': row['Phylum'],
                        'class': row['Class'],
                        'order': row['Order'],
                        'family': row['Family'],
                        'genus': row['Genus'],
                        'species': row['Species']
                    }
    except FileNotFoundError:
        print(f"Error: Taxonomy file '{taxonomy_file}' not found.")
        sys.exit(1)
    except Exception as e:
        print(f"Error reading taxonomy file: {e}")
        sys.exit(1)
        
    return taxonomy_data

def find_available_organisms(data_dir: str = 'public/data') -> List[str]:
    """
    Find all available organism IDs by scanning the data directory.
    
    Args:
        data_dir: Path to the data directory
        
    Returns:
        List of available organism IDs
    """
    available_organisms = []
    
    if not os.path.exists(data_dir):
        print(f"Warning: Data directory '{data_dir}' not found.")
        return available_organisms
    
    try:
        for item in os.listdir(data_dir):
            item_path = os.path.join(data_dir, item)
            if os.path.isdir(item_path) and item.startswith('GC'):
                # Check if it has analysis data
                analysis_dir = os.path.join(item_path, 'analysis')
                if os.path.exists(analysis_dir):
                    available_organisms.append(item)
    except Exception as e:
        print(f"Error scanning data directory: {e}")
        
    return sorted(available_organisms)

def generate_interesting_individuals(organism_ids: List[str], taxonomy_data: Dict[str, Dict[str, str]], output_file: str):
    """
    Generate the interesting_individuals.csv file.
    
    Args:
        organism_ids: List of organism IDs to include
        taxonomy_data: Dictionary with taxonomy information
        output_file: Path to the output CSV file
    """
    found_organisms = []
    missing_organisms = []
    
    for organism_id in organism_ids:
        if organism_id in taxonomy_data:
            found_organisms.append(organism_id)
        else:
            missing_organisms.append(organism_id)
    
    if missing_organisms:
        print(f"Warning: The following organism IDs were not found in taxonomy data:")
        for organism_id in missing_organisms:
            print(f"  - {organism_id}")
        print()
    
    if not found_organisms:
        print("Error: No valid organism IDs found in taxonomy data.")
        sys.exit(1)
    
    # Write the CSV file
    try:
        with open(output_file, 'w', newline='', encoding='utf-8') as f:
            fieldnames = ['id', 'superkingdom', 'phylum', 'class', 'order', 'family', 'genus', 'species']
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            
            writer.writeheader()
            
            for organism_id in found_organisms:
                taxonomy_info = taxonomy_data[organism_id]
                writer.writerow({
                    'id': organism_id,
                    'superkingdom': taxonomy_info['superkingdom'],
                    'phylum': taxonomy_info['phylum'],
                    'class': taxonomy_info['class'],
                    'order': taxonomy_info['order'],
                    'family': taxonomy_info['family'],
                    'genus': taxonomy_info['genus'],
                    'species': taxonomy_info['species']
                })
                
        print(f"Successfully generated '{output_file}' with {len(found_organisms)} organisms:")
        for organism_id in found_organisms:
            taxonomy_info = taxonomy_data[organism_id]
            print(f"  - {organism_id}: {taxonomy_info['genus']} {taxonomy_info['species']}")
            
    except Exception as e:
        print(f"Error writing output file: {e}")
        sys.exit(1)

def main():
    """Main function."""
    print("Interesting Individuals CSV Generator")
    print("=" * 40)
    
    # Load taxonomy data
    print(f"Loading taxonomy data from '{TAXONOMY_FILE}'...")
    taxonomy_data = load_taxonomy_data(TAXONOMY_FILE)
    print(f"Loaded taxonomy data for {len(taxonomy_data)} organisms.")
    
    # Find available organisms
    print("\nScanning for available organism data...")
    available_organisms = find_available_organisms()
    if available_organisms:
        print(f"Found {len(available_organisms)} organisms with data files:")
        for i, organism_id in enumerate(available_organisms[:10]):  # Show first 10
            if organism_id in taxonomy_data:
                taxonomy_info = taxonomy_data[organism_id]
                print(f"  {i+1}. {organism_id}: {taxonomy_info['genus']} {taxonomy_info['species']}")
        if len(available_organisms) > 10:
            print(f"  ... and {len(available_organisms) - 10} more")
    else:
        print("No organisms with data files found.")
    
    # Check if specified organisms have data files
    print(f"\nChecking specified organism IDs:")
    for organism_id in ORGANISM_IDS:
        has_data = organism_id in available_organisms
        has_taxonomy = organism_id in taxonomy_data
        status = "✓" if has_data and has_taxonomy else "✗"
        data_status = "data available" if has_data else "no data files"
        taxonomy_status = "taxonomy available" if has_taxonomy else "no taxonomy info"
        print(f"  {status} {organism_id}: {data_status}, {taxonomy_status}")
    
    # Generate the CSV file
    print(f"\nGenerating '{OUTPUT_FILE}'...")
    generate_interesting_individuals(ORGANISM_IDS, taxonomy_data, OUTPUT_FILE)
    
    print(f"\nDone! You can now use the '{OUTPUT_FILE}' file in your application.")

if __name__ == "__main__":
    main()