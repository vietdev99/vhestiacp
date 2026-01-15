#!/usr/bin/env python3
import paramiko
import sys

# SSH connection details
hostname = '192.168.0.125'
username = 'root'
local_file = r'd:\Workspace\Messi\Code\VHestiaCP\web_v2\server\src\routes\mongodb.js'
remote_file = '/usr/local/hestia/web_v2/server/src/routes/mongodb.js'

try:
    # Create SSH client
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    # Connect using SSH key
    ssh.connect(hostname, username=username)
    
    # Create SFTP client
    sftp = ssh.open_sftp()
    
    # Upload file
    print(f"Uploading {local_file} to {hostname}:{remote_file}")
    sftp.put(local_file, remote_file)
    print("Upload successful!")
    
    # Close connections
    sftp.close()
    ssh.close()
    
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
