#!/bin/bash

# Script to generate file index for the web application
# This creates a list of all available data files for fast checking

echo "Generating file index..."

# Remove existing index
rm -f ./public/file_index.txt

# Add CSV files from analysis directories
echo "Adding CSV files from analysis directories..."
for dir in data/*/analysis/; do 
    ls "$dir"*.csv 2>/dev/null
done >> ./public/file_index.txt

# Add FASTA files from preprocessing directories
echo "Adding FASTA files from preprocessing directories..."
for dir in data/*/preprocessing/; do 
    ls "$dir"*.fna 2>/dev/null
done >> ./public/file_index.txt

# Add CSV files from postprocessing directories
echo "Adding CSV files from postprocessing directories..."
for dir in data/*/postprocessing/; do 
    ls "$dir"*.csv 2>/dev/null
done >> ./public/file_index.txt

# Count and report
total_files=$(wc -l < ./public/file_index.txt)
echo "Generated index with $total_files files"
echo "Index saved to: ./public/file_index.txt"