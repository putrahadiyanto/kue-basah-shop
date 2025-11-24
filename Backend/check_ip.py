import socket

def get_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # doesn't even have to be reachable
        s.connect(('10.255.255.255', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP

if __name__ == "__main__":
    ip = get_ip()
    print(f"\nYour Local IP Address is: {ip}")
    print(f"To allow other devices to connect, update your Frontend/.env.local file:")
    print(f"NEXT_PUBLIC_API_URL=http://{ip}:8000")
    print("\nAlso ensure your Backend is running with: uvicorn main:app --host 0.0.0.0 --port 8000 --reload\n")
