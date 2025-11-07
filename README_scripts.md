# Interesting Individuals CSV Generator

This directory contains Python scripts to generate the `interesting_individuals.csv` file from a list of organism IDs. The scripts automatically look up taxonomic information from the `data/taxonomy.csv` file.

## Scripts

### 1. `generate_interesting_individuals.py` (Comprehensive)

This is the full-featured script with data validation and detailed output.

**Features:**
- Validates organism IDs against available data files
- Shows detailed status for each organism
- Scans for available organisms in the data directory
- Provides comprehensive error reporting

**Usage:**
```bash
python3 generate_interesting_individuals.py
```

**Configuration:**
Edit the `ORGANISM_IDS` list in the script to specify which organisms to include:
```python
ORGANISM_IDS = [
    'GCF_000005845.2_ASM584v2',
    'GCF_000006765.1_ASM676v1', 
    'GCF_000006945.2_ASM694v2'
]
```

### 2. `generate_csv.py` (Simple Command Line)

This is a simpler script that takes organism IDs as command line arguments.

**Usage with command line arguments:**
```bash
python3 generate_csv.py GCF_000005845.2_ASM584v2 GCF_000006765.1_ASM676v1 GCF_000006945.2_ASM694v2
```

**Usage with input file:**
```bash
python3 generate_csv.py --file organism_ids.txt --output my_organisms.csv
```

**Command line options:**
- `--file`, `-f`: Read organism IDs from a text file (one per line)
- `--output`, `-o`: Specify output file name (default: `interesting_individuals.csv`)
- `--help`, `-h`: Show help message

## Input File Format

When using the `--file` option, create a text file with one organism ID per line:

```
GCF_000005845.2_ASM584v2
GCF_000006765.1_ASM676v1
GCF_000006945.2_ASM694v2
GCF_000009045.1_ASM904v1
GCF_000013425.1_ASM1342v1
```

## Output Format

Both scripts generate a CSV file with the following columns:
- `id`: Organism ID
- `superkingdom`: Domain (e.g., Bacteria)
- `phylum`: Phylum name
- `class`: Class name
- `order`: Order name
- `family`: Family name
- `genus`: Genus name
- `species`: Species name

Example output:
```csv
id,superkingdom,phylum,class,order,family,genus,species
GCF_000005845.2_ASM584v2,Bacteria,Pseudomonadota,Gammaproteobacteria,Enterobacterales,Enterobacteriaceae,Escherichia,Escherichia coli
GCF_000006765.1_ASM676v1,Bacteria,Pseudomonadota,Gammaproteobacteria,Pseudomonadales,Pseudomonadaceae,Pseudomonas,Pseudomonas aeruginosa
```

## Requirements

- Python 3.6 or higher
- The `data/taxonomy.csv` file must be present in the project directory

## Examples

1. **Generate with default organisms:**
   ```bash
   python3 generate_interesting_individuals.py
   ```

2. **Generate with specific organisms:**
   ```bash
   python3 generate_csv.py GCF_000005845.2_ASM584v2 GCF_000006765.1_ASM676v1
   ```

3. **Generate from file:**
   ```bash
   echo -e "GCF_000005845.2_ASM584v2\nGCF_000006765.1_ASM676v1" > my_organisms.txt
   python3 generate_csv.py --file my_organisms.txt
   ```

4. **Custom output file:**
   ```bash
   python3 generate_csv.py --output custom_organisms.csv GCF_000005845.2_ASM584v2
   ```

## Error Handling

The scripts will:
- Warn about organism IDs not found in the taxonomy data
- Continue processing valid IDs even if some are invalid
- Exit with an error if no valid organism IDs are found

## Integration with Vite Application

After generating the CSV file, place it in the root directory of your Vite project. The `InterestingIndividuals.tsx` component will automatically load and display the organisms with their taxonomic information and structural analysis plots.