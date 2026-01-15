import subprocess
import os

def transfer():
    try:
        print("Reading dist.zip...")
        if not os.path.exists('dist.zip'):
             print("Error: dist.zip not found")
             return

        with open('dist.zip', 'rb') as f:
            data = f.read()
        
        print(f"Transferring {len(data)} bytes via SSH...")
        # Use ssh to pipe data
        cmd = ['ssh', 'root@192.168.0.125', 'cat > /tmp/dist.zip']
        proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
        proc.communicate(input=data)
        
        if proc.returncode != 0:
            print("Transfer failed with return code", proc.returncode)
        else:
            print("Transfer success")
            
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == '__main__':
    transfer()
