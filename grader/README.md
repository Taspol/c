# Grader

A small web grader for C and C++ exercises, sized for a handful of students.
Students log in, read a problem, submit code in the browser, and get a verdict
per test case (AC / WA / TLE / MLE / RE / CE). Admins write problems, upload
test cases and see everyone's scores.

```
Browser ──► Caddy (HTTPS) ──► web (Next.js) ──┐
                                              ├──► SQLite file (data volume)
                               worker ────────┘
                                 │  one throwaway container per submission
                                 ▼
                               gcc:14 sandbox
```

- **web/**: the Next.js app (pages, login, admin) and the **worker**, which
  takes queued submissions from the database and judges them.
- **Sandbox:** each submission is compiled and run in a fresh `gcc:14`
  container with no network, no Linux capabilities, a read-only filesystem
  (except a 64 MB scratch dir), an unprivileged user, 1 CPU, the problem's
  memory limit and at most 64 processes. The container is deleted right after.
- **Database:** one SQLite file. Back it up with `pnpm backup`.

## Problems and test cases

Each problem has a Markdown statement, a time limit, a memory limit and test
cases (input + expected output + points). Programs read **stdin** and write
**stdout**. Output is compared ignoring trailing spaces and trailing blank
lines. Compiler: GCC 14, `-O2`, C as `gnu11`, C++ as `gnu++17`.

- Test cases marked **Example** are shown on the problem page, and students
  see their own output for them when they fail. Other tests are hidden:
  students only see the verdict.
- Upload many tests at once by selecting files like `1.in`, `1.out`,
  `2.in`, `2.out` (`.ans` also works). Files named `sample…`/`example…`
  become examples.
- After fixing a test case, use **Rejudge all submissions** on the problem page.
- Time shown is wall-clock time inside the sandbox. Memory isn't measured, but
  going over the limit gives MLE.

## Local development (macOS)

Needs [pnpm](https://pnpm.io) (`corepack enable` installs the pinned version).

```bash
cd web
cp .env.example .env
pnpm install
pnpm exec prisma migrate deploy   # creates prisma/dev.db
pnpm seed                         # admin / admin123 and an "A + B" problem
pnpm dev                          # website + judge → http://localhost:3000
```

`pnpm dev` starts both the website (`[web]` in the log) and the judge worker
(`[judge]`). Use `pnpm dev:web` or `pnpm worker` to run just one of them.

The judge engine is set by `JUDGE_ENGINE` in `web/.env`:

- `local`: compiles with your Mac's own compiler, no Docker needed, but
  **no sandbox**, so only submit your own code. Apple's compiler has no
  `<bits/stdc++.h>`.
- `docker`: the same sandbox the server uses. Run `colima start` (or Docker
  Desktop) first; the first run downloads `gcc:14` (about 1.4 GB, once).

## Deploying to a VPS

### 1. Get a server

Any Linux VPS with Docker works. 1 vCPU / 1 GB RAM is enough for a few
students (e.g. DigitalOcean, Vultr, Hetzner, Linode); pick Ubuntu 24.04 LTS if
unsure. Point a domain's DNS **A record** at the server's IP if you want HTTPS.

### 2. Install Docker

```bash
ssh root@YOUR_SERVER_IP
curl -fsSL https://get.docker.com | sh
```

### 3. Copy the project and configure it

```bash
git clone <your repo url> comprog && cd comprog/grader
./scripts/setup.sh
```

`setup.sh` asks for the domain, the admin account and an optional class code,
then writes `.env` (git-ignored; keep it private).

- Domain like `grader.example.com`: Caddy gets an HTTPS certificate
  automatically (ports 80 and 443 must be open).
- Domain `:80`: plain HTTP on the server IP, for a quick test only.

### 4. Start everything

```bash
docker compose up -d --build
docker compose ps                # caddy, web (healthy), worker: running
docker compose logs -f worker    # first start pulls gcc:14
```

Open your domain, log in as the admin, open **A + B** and submit a solution
to check that judging works.

### 5. Firewall (recommended)

```bash
sudo ufw allow OpenSSH && sudo ufw allow 80 && sudo ufw allow 443 && sudo ufw enable
```

## Operating it

| Task | Command (in `grader/`) |
|---|---|
| Logs | `docker compose logs -f web worker` |
| Update after `git pull` | `docker compose up -d --build` (migrations run on start) |
| Back up the database | `docker compose exec web pnpm backup /app/data/backups/grader.db` then `docker compose cp web:/app/data/backups ./backups` |
| Restore a backup | `docker compose stop web worker`, `docker compose cp ./backups/grader.db web:/app/data/grader.db`, `docker compose start web worker` |
| Close registration | set `REGISTRATION_OPEN=false` in `.env`, then `docker compose up -d` |

Admins can promote users and reset passwords on the **Users** page.

The worker mounts the host's Docker socket so it can start sandbox containers,
which gives the worker container full control of the host's Docker. Only
student code runs in the locked-down sandboxes; the worker itself runs only
this project's code.

## Configuration reference (`.env`)

| Variable | Meaning |
|---|---|
| `DOMAIN` | Hostname for Caddy, or `:80` |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | Admin created on first start (changing them later creates another admin; it never edits an existing one) |
| `REGISTRATION_CODE` | If set, students must enter it to register |
| `REGISTRATION_OPEN` | `false` disables self-registration |
| `COOKIE_SECURE` | `false` only when serving over plain HTTP |
| `WORKER_CONCURRENCY` | Submissions judged in parallel (default 1) |
| `JUDGE_IMAGE` | Compiler image for the sandbox (default `gcc:14`) |
