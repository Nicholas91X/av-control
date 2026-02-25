# 🚀 INSTALLAZIONE AV CONTROL

## PREREQUISITI

✅ Scheda ARM32 con Debian Linux  
✅ IP configurato: 192.168.1.100  
✅ Daemon Svilen attivo sulla porta 8080  
✅ Accesso SSH come root

---

## INSTALLAZIONE RAPIDA

### 1. Carica il pacchetto

Dal tuo PC:

```bash
scp -l 8000 av-control-deployment.tar.gz root@192.168.1.100:/tmp/
```

### 2. Esegui installazione

SSH sulla scheda:

```bash
ssh root@192.168.1.100
cd /tmp
tar -xzf av-control-deployment.tar.gz
bash install.sh
```

### 3. Fine!

Vai su: **http://192.168.1.100:8000**  
Login: `admin` / `admin123`

---

## VERIFICA

```bash
# Status servizio
systemctl status av-control

# Log real-time
journalctl -u av-control -f
```

---

## PROBLEMI?

**Servizio non parte:**

```bash
journalctl -u av-control -n 50
```

**Hardware disconnesso:**

```bash
# Verifica daemon Svilen
wget -qO- http://localhost:8080/api/device/status
```

**Contatti:**  
Backend/Frontend: Nicholas  
Daemon/Hardware: Svilen
