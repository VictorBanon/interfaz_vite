#!/usr/bin/env python3
"""
Simple script to generate interesting_individuals.csv from command line arguments.

Usage:
    python generate_csv.py GCF_000005845.2_ASM584v2 GCF_000006765.1_ASM676v1 GCF_000006945.2_ASM694v2
    
Or read from a file:
    python generate_csv.py --file organism_ids.txt
"""

import csv
import sys
import argparse
from typing import List, Dict

def load_taxonomy_data(taxonomy_file: str = 'data/taxonomy.csv') -> Dict[str, Dict[str, str]]:
    """Load taxonomy data from CSV file."""
    taxonomy_data = {}
    
    try:
        with open(taxonomy_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                organism_id = row['ID']
                if organism_id not in taxonomy_data:
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

def generate_csv(organism_ids: List[str], output_file: str = 'interesting_individuals.csv'):
    """Generate the CSV file from organism IDs."""
    taxonomy_data = load_taxonomy_data()
    
    found_organisms = []
    missing_organisms = []
    
    for organism_id in organism_ids:
        if organism_id in taxonomy_data:
            found_organisms.append(organism_id)
        else:
            missing_organisms.append(organism_id)
    
    if missing_organisms:
        print("Warning: The following organism IDs were not found:")
        for organism_id in missing_organisms:
            print(f"  - {organism_id}")
    
    if not found_organisms:
        print("Error: No valid organism IDs found.")
        sys.exit(1)
    
    # Write CSV file
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
    
    print(f"Generated '{output_file}' with {len(found_organisms)} organisms:")
    for organism_id in found_organisms:
        taxonomy_info = taxonomy_data[organism_id]
        print(f"  - {organism_id}: {taxonomy_info['genus']} {taxonomy_info['species']}")

def main():
    parser = argparse.ArgumentParser(description='Generate interesting_individuals.csv from organism IDs')
    parser.add_argument('organism_ids', nargs='*', help='Organism IDs to include')
    parser.add_argument('--file', '-f', help='Read organism IDs from file (one per line)')
    parser.add_argument('--output', '-o', default='interesting_individuals.csv', help='Output file name')
    
    args = parser.parse_args()
    
    if args.file:
        # Read from file
        try:
            with open(args.file, 'r') as f:
                organism_ids = [line.strip() for line in f if line.strip()]
        except FileNotFoundError:
            print(f"Error: File '{args.file}' not found.")
            sys.exit(1)
    elif args.organism_ids:
        # Read from command line arguments
        organism_ids = args.organism_ids
    else:
        print("Error: Please provide organism IDs either as arguments or via --file option.")
        parser.print_help()
        sys.exit(1)
    
    generate_csv(organism_ids, args.output)

if __name__ == "__main__":
    main()