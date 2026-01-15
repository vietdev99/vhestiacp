import subprocess
import sys

# Read file
file_path = r"d:\Workspace\Messi\Code\VHestiaCP\web_v2\server\src\routes\mongodb.js"
remote_path = "/usr/local/hestia/web_v2/server/src/routes/mongodb.js"

with open(file_path, "rb") as f:
    content = f.read()

print(f"Reading {file_path}...")
print(f"File size: {len(content)} bytes")

# Transfer via SSH
import base64
encoded = base64.b64encode(content).decode()

# Split into chunks if too large
chunk_size = 50000
chunks = [encoded[i:i+chunk_size] for i in range(0, len(encoded), chunk_size)]

print(f"Transferring in {len(chunks)} chunks...")

# Write to temp file on server
for i, chunk in enumerate(chunks):
    mode = ">" if i == 0 else ">>"
    cmd = f'ssh root@192.168.0.125 "echo \'{chunk}\' {mode} /tmp/mongodb_b64.txt"'
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error on chunk {i}: {result.stderr}")
        sys.exit(1)
    print(f"Chunk {i+1}/{len(chunks)} transferred")

# Decode on server
cmd = 'ssh root@192.168.0.125 "base64 -d /tmp/mongodb_b64.txt > ' + remote_path + ' && rm /tmp/mongodb_b64.txt && echo OK"'
result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
if result.returncode == 0:
    print("Transfer success")
else:
    print(f"Error: {result.stderr}")
