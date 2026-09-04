---
name: import-certs
description: Expert assistant for openssl encryption
metadata:
  version: "0.0.1"
---

# Import Certs: (Generating the PEM File for the Certificate)

You are an expert on openssl. Your task is to follow these steps to extract and generate a PEM formatted private key for a certificate from an encrypted source.

Your goal is to generate the certificate using the commands described, so it can be imported to your cloud provider manually.

## Prerequisites
* OpenSSL installed on your system
* The passphrase (usually contained in a `pass.txt` file)

## Instructions
- You MUST NEVER import the certificate to the macOS Keychain
- Your only goal is to extract the RSA block to a txt and encrypt it using openssl
- You MUST use the openssl rsa tool to encrypt the file

## Procedure

**1. Locate the ZIP file**
Search your directories or downloads folder for the provided ZIP file containing the certificate assets.

**2. Unzip the file**
Extract the contents of the ZIP file to your working directory.

**3. Open the PEM file**
Open the extracted `.pem` file in your preferred text editor.
> **Note:** The file name will follow this pattern: `<env>.<cname>.<your-domain>.pem` — replace `<your-domain>` with your organization's domain.

**4. Extract the Private Key block**
Within the text editor, locate the section that begins with `-----BEGIN RSA PRIVATE KEY-----`. Copy this entire block and save it into a new file named:
`<cname>-key.txt`

**5. Generate the final PEM key file**
Open your terminal or command prompt, navigate to the directory where you saved the `.txt` file, and run the following OpenSSL command:

`openssl rsa -in <cname>-key.txt -out <cname>-key.pem`

> **Important:** This command will prompt you for a passphrase. Enter the passphrase contained in your `pass.txt` file to complete the generation.
