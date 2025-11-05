# 🚀 GitHub Publishing Guide

## Step 1: Restart VS Code
**Close and reopen VS Code completely** so Git loads into your terminal.

## Step 2: Configure Git (First time only)
Open a new terminal in VS Code and run:

```powershell
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

Replace with your actual name and email.

## Step 3: Initialize Git Repository

```powershell
cd C:\Users\AsbjørnSøskov\Desktop\test3
git init
git add .
git commit -m "Initial commit: Workout Tracker app"
```

## Step 4: Create GitHub Repository

1. Go to https://github.com/new
2. **Repository name**: `workout-tracker` (or any name you want)
3. **Description**: "Mobile-optimized workout tracking app with React, TypeScript, Supabase"
4. **Visibility**: Choose Public or Private
5. **DON'T** check "Add README" (we already have one)
6. Click **"Create repository"**

## Step 5: Connect to GitHub

GitHub will show you commands. Run these in your terminal:

```powershell
git remote add origin https://github.com/YOUR-USERNAME/workout-tracker.git
git branch -M main
git push -u origin main
```

Replace `YOUR-USERNAME` with your actual GitHub username.

## Step 6: Done! 🎉

Your code is now on GitHub at:
```
https://github.com/YOUR-USERNAME/workout-tracker
```

---

## 🔄 Future Updates

When you make changes:

```powershell
git add .
git commit -m "Description of changes"
git push
```

---

## 💡 Bonus: Auto-deploy from GitHub

Want Vercel to auto-deploy when you push to GitHub?

1. Go to https://vercel.com/huus-projects-7b2d3bc4/test3/settings/git
2. Click "Connect Git Repository"
3. Select your GitHub repo
4. Now every `git push` automatically deploys! 🚀

---

## ❓ Need Help?

If you get stuck:
- Make sure VS Code is restarted
- Check Git is installed: `git --version`
- Make sure you're logged into GitHub
