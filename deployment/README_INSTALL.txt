VerbumDigital AV Control - Installation Guide
=============================================
Version: 1.1.1 (Production)

This package contains the AV Control web interface and backend server for the A13-Olinuxino board.

Files included:
- av-control         : The main executable binary (ARMv7)
- public/            : Directory containing the frontend web application assets
- scripts/install.sh : Automatic installation script
- scripts/av-control.service : Systemd service definition

PREREQUISITES:
--------------
- Target device: A13-Olinuxino (or compatible ARMv7 Linux system)
- Root access (SSH or Terminal)
- Helper tools: tar, systemctl

INSTALLATION STEPS:
-------------------

1. Copy the package to the device (e.g., via SCP):
   scp av-control-deployment.tar.gz root@<IP_ADDRESS>:/tmp/

2. Connect to the device via SSH:
   ssh root@<IP_ADDRESS>

3. Extract the package:
   cd /tmp
   tar -xzf av-control-deployment.tar.gz

4. Run the installer:
   cd /tmp
   chmod +x scripts/install.sh
   ./scripts/install.sh

   The installer will:
   - Stop any existing instance
   - Install the binary to /usr/local/bin/av-control
   - Copy web assets to /usr/local/share/av-control/public
   - Install and enable the systemd service
   - Start the application

5. Verification:
   Check if the service is running:
   systemctl status av-control

   Open a web browser and navigate to:
   http://<IP_ADDRESS>:80

TROUBLESHOOTING:
----------------
- If the service fails to start, check logs:
  journalctl -u av-control -f

- Ensure port 80 is free. The application listens on port 80 by default.

- Database: The database is automatically created at /var/lib/av-control/av-control.db

SUPPORT:
--------
For any issues, please contact the development team.
