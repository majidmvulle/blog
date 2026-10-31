---
title: "What's running in my homelab"
description: 'A tour of the hardware, the GitOps setup, and the services running on my home Kubernetes cluster.'
pubDate: '2026-10-31'
---

My homelab started as a couple of Raspberry Pis and grew into a small Kubernetes cluster I manage entirely through Git. This first post is a tour of what's running today. Later posts will go deeper on each piece.

All the configuration is public at [github.com/majidmvulle/homelab](https://github.com/majidmvulle/homelab).

## Hardware

- **3x HP ProDesk 600 G4 Mini** (Intel i5-8500T, 16 GB RAM, NVMe storage). These are the Kubernetes nodes. Small, quiet, low-power, and cheap second-hand.
- **Lenovo ThinkCentre M920q Tiny** running **Proxmox**, which hosts **OPNsense** as the edge firewall and router.
- **Raspberry Pis**: two Pi 4s (8 GB) for general-purpose jobs and a couple of Pi Zero 2 Ws for lightweight utility work. The Pis were the original cluster before the mini PCs took over.
- **Synology NAS** running **Garage**, a lightweight S3-compatible object store, as the off-cluster backup target.

Node provisioning (base packages, keepalived, PostgreSQL prep, Proxmox prep) is handled by Ansible.

## Kubernetes and GitOps

The cluster runs **k3s**. Once the cluster and Argo CD are bootstrapped, I don't touch it with `kubectl apply`: every change goes through a Git commit, and **Argo CD** reconciles it.

Two **ApplicationSets** scan the repo, one for `platform/` and one for `apps/`. Each service is a directory with an `app.yaml` that declares how it's deployed:

- `type: remote`: a wrapper `Chart.yaml` that pulls an upstream Helm chart as a dependency (cert-manager, Traefik, kube-prometheus-stack).
- `type: local`: a chart I maintain in the repo's `charts/` directory (Jellyfin, Navidrome, the *arr apps).
- `type: oci`: a chart pulled from an OCI registry.

Adding a service means creating a folder with an `app.yaml` and a `values.yaml`. The ApplicationSet picks it up and deploys it into a namespace named after its category. **Renovate** opens PRs to keep chart and image versions current.

## Networking and TLS

- **MetalLB** hands out LoadBalancer IPs on the LAN.
- **Traefik** is the single ingress point. Services are `ClusterIP` behind an Ingress, never their own LoadBalancer.
- **cert-manager** issues a wildcard certificate for `*.homelab.internal`, signed by my own self-signed CA. Traefik serves it as the default cert, so individual Ingresses don't reference TLS secrets.
- **external-dns** watches Ingresses and writes DNS records to the OPNsense resolver over RFC2136, so a new service gets a hostname automatically.

## Storage and backups

- **Longhorn** provides replicated block storage with three main storage classes: `longhorn-ephemeral` and `longhorn-standard` (reclaim policy Delete), and `longhorn-persistent` (Retain), all with two replicas. Each workload picks its class explicitly based on how much I'd miss the data.
- **Velero** and **Longhorn's backup target** both ship backups to Garage on the Synology, outside the cluster. In-cluster MinIO exists for convenience, but I don't count it as a backup.
- **CloudNativePG** runs the shared PostgreSQL cluster, with a connection pooler and declaratively managed databases and roles.

## Secrets and policy

- **External Secrets Operator** syncs secrets into each namespace from a dedicated hub namespace in the cluster. Secret values never live in Git. Only the `ExternalSecret` definitions do.
- **Kyverno** enforces cluster policies. For example, deleting a Longhorn-backed StatefulSet pod requires a maintenance annotation, so I can't casually drain storage during experiments.

## Observability and CI

- **kube-prometheus-stack** (Prometheus, Alertmanager, Grafana) for metrics and alerting.
- **SigNoz** with an **OpenTelemetry Collector** for traces and logs.
- **Actions Runner Controller** runs autoscaling, ephemeral GitHub Actions runners inside the cluster.

## Apps

The fun part:

- **Jellyfin** for video, alongside **Sonarr** and **Radarr**.
- **Navidrome** for music, with **Lidarr** and **Syncthing**.
- **Prowlarr**, **FlareSolverr** and **qBittorrent** supporting the media stack.
- **AFFiNE** for notes and **Mailpit** for catching outgoing test email.
- Supporting services like **Valkey**, **Temporal** and **HAProxy**.

## What's next

Posts I'm planning:

1. Bootstrapping k3s and Argo CD from scratch
2. The `app.yaml` pattern: one ApplicationSet for remote, local and OCI charts
3. Wildcard TLS for `*.homelab.internal` with a self-signed CA
4. Longhorn storage tiers and off-cluster backups to Garage on a Synology
5. Moving from a flat LAN to OPNsense with VLANs
6. Running GitHub Actions runners in the homelab
