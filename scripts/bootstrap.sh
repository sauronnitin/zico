#!/bin/bash
# Zico Phase 1 Bootstrap — run once from repo root
# Usage: bash scripts/bootstrap.sh

set -e

echo "🏗️  Scaffolding Zico directory structure..."

# Core source
mkdir -p src/{cli/commands,intake,planning,polecats,hooks,connectors,convoy,skills}

# Domains
mkdir -p domains/auto-detected

# Formulas
mkdir -p formulas

# Rigs
mkdir -p rigs/{rainmaker/{crew/nitin,hooks,polecats},npd-ble/{crew/nitin,hooks,polecats},design-system/{crew/nitin,hooks,polecats},portfolio/{crew/nitin,hooks,polecats},mentoring/{crew/nitin,hooks,polecats}}

# Sentinel
mkdir -p sentinel

# Skills directory — this is the auto-discovery root
# Skills are added by dropping a folder with SKILL.md into skills/
mkdir -p skills

# Templates
mkdir -p templates

# Tests
mkdir -p tests

# Hooks (persistent state)
mkdir -p hooks

echo "📦 Initializing package.json..."
if [ ! -f package.json ]; then
  cat > package.json << 'EOF'
{
  "name": "zico",
  "version": "0.1.0",
  "description": "Gastown-inspired AI orchestrator for UX design workflows",
  "type": "module",
  "main": "src/cli/index.ts",
  "bin": { "zico": "./dist/cli/index.js" },
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/cli/index.ts",
    "start": "zico start",
    "test": "vitest"
  },
  "dependencies": {},
  "devDependencies": {}
}
EOF
fi

echo "⚙️  Initializing tsconfig.json..."
if [ ! -f tsconfig.json ]; then
  cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
EOF
fi

echo "📝 Creating .gitignore..."
cat > .gitignore << 'EOF'
node_modules/
dist/
*.log
.env
.DS_Store
EOF

echo "✅ Scaffold complete. Structure:"
find . -type d -not -path './node_modules/*' -not -path './.git/*' -not -name '.' | sort | head -50
echo ""
echo "Next: copy your skills into skills/ and run 'git init && git add -A && git commit -m \"Phase 1 scaffold\"'"
