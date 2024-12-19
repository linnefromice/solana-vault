# solana-vault

## how to use

Deploy

```bash
# update Anchor.toml
## add [programs.xxx]
## update provider.cluster

anchor build
anchor deploy
```

## Deployments

- devnet
  - <https://solscan.io/account/EvdLWk84s1qQxTgKE7afWcr1oKdwjD5HhsDCxk6kM1wj?cluster=devnet>
  - <https://solscan.io/tx/GwHZQpohQNTCMbSXfoGRyjBfaAF64CUbvvyZ7DVrzpYnvHERESn7uomqXCg8Uk3CyTFzr2xiNKQrnZs5j2aWx7y?cluster=devnet>

```bash
# devnet
Deploying cluster: https://api.devnet.solana.com
Upgrade authority: ...
Deploying program "solana_vault"...
Program path: /---/solana-vault/target/deploy/solana_vault.so...
Program Id: EvdLWk84s1qQxTgKE7afWcr1oKdwjD5HhsDCxk6kM1wj

Signature: GwHZQpohQNTCMbSXfoGRyjBfaAF64CUbvvyZ7DVrzpYnvHERESn7uomqXCg8Uk3CyTFzr2xiNKQrnZs5j2aWx7y
```
