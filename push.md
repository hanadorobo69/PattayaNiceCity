# Déployer sur le VPS

## Commande unique

```bash
rsync -az --exclude 'node_modules' --exclude '.next' --exclude '.git' \
  /Users/topgdev/dev/rencontre_femme/ pattaya:~/rencontre_femme/ \
  && ssh pattaya "cd ~/rencontre_femme && npm run build 2>&1 | tail -5 && pm2 restart rencontrefemme"
```

## Infos VPS

| Élément | Valeur |
|---|---|
| Alias SSH | `pattaya` |
| IP | `5.223.65.84` |
| Dossier app | `~/rencontre_femme` |
| Port app | `3001` |
| Process PM2 | `rencontrefemme` |
| URL prod | `https://jerencontre.duckdns.org` |

## Étapes détaillées

### 1. Envoyer les fichiers
```bash
rsync -az --exclude 'node_modules' --exclude '.next' --exclude '.git' \
  /Users/topgdev/dev/rencontre_femme/ pattaya:~/rencontre_femme/
```

### 2. Build sur le VPS
```bash
ssh pattaya "cd ~/rencontre_femme && npm run build"
```

### 3. Redémarrer l'app
```bash
ssh pattaya "pm2 restart rencontrefemme"
```

### 4. Vérifier que ça tourne
```bash
ssh pattaya "pm2 status"
```

## Commandes utiles sur le VPS

```bash
# Voir les logs en live
ssh pattaya "pm2 logs rencontrefemme"

# Voir le statut
ssh pattaya "pm2 status"

# Redémarrer manuellement
ssh pattaya "pm2 restart rencontrefemme"

# Voir les erreurs récentes
ssh pattaya "pm2 logs rencontrefemme --err --lines 50 --nostream"
```

## Changer le nom de domaine

Si tu veux pointer vers un nouveau domaine (ex: `monsite.com`) :

### 1. Mettre à jour l'URL dans l'app
```bash
ssh pattaya "sed -i 's|NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL=https://monsite.com|' ~/rencontre_femme/.env.local"
```

### 2. Mettre à jour la config Nginx
```bash
ssh pattaya "sudo nano /etc/nginx/sites-available/rencontrefemme"
# Remplacer server_name jerencontre.duckdns.org par le nouveau domaine
```

### 3. Supprimer l'ancien certificat SSL et en générer un nouveau
```bash
ssh pattaya "sudo certbot delete --cert-name jerencontre.duckdns.org"
ssh pattaya "sudo certbot --nginx -d monsite.com --non-interactive --agree-tos -m admin@monsite.com --redirect"
```

### 4. Rebuild et redémarrer
```bash
ssh pattaya "cd ~/rencontre_femme && npm run build && pm2 restart rencontrefemme"
```

> **Prérequis** : le DNS du nouveau domaine doit pointer vers `5.223.65.84` avant de lancer certbot.

## Notes importantes

- **Ne pas modifier** `.env.local` sur le VPS — `NEXT_PUBLIC_APP_URL` doit rester `https://jerencontre.duckdns.org`
- Le projet tourne avec `server.js` (custom Node server) pour socket.io — ne pas utiliser `next start`
- SSL géré par Let's Encrypt + Certbot (renouvellement automatique)
- Un autre site (`pattayavicecity`) tourne sur le port `3000` — ne pas changer le port de rencontrefemme
