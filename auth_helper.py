#!/usr/bin/env python3
import subprocess
import sys

verification_code = sys.argv[1] if len(sys.argv) > 1 else input("Enter verification code: ")

# Run gcloud auth login with the verification code
process = subprocess.Popen(
    ['/home/harryfair/google-cloud-sdk/bin/gcloud', 'auth', 'login', '--no-launch-browser'],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True
)

# Wait for the prompt and send the verification code
stdout, stderr = process.communicate(input=verification_code)

print(stdout)
if stderr:
    print("STDERR:", stderr)