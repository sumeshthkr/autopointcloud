# Quick Start Guide

Get AutoPointCloud running in under 5 minutes!

## 🚀 One-Command Deploy

### Deploy to Vercel
```bash
npx vercel --prod
```

### Deploy to Netlify
```bash
npx netlify-cli deploy --prod --build
```

## 💻 Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

### 3. Open Browser
Navigate to http://localhost:3000

## 📤 Try It Out

### Upload a Demo File

1. Click the upload zone or drag and drop a file
2. Use included demo files:
   - `/public/demo_data/kitti_street_scene.pcd` (5,000 points)
   - `/public/demo_data/demo_pointcloud.pcd` (1,000 points)

### Process Point Cloud

1. Select a filter type from dropdown
2. Adjust parameters with sliders
3. Click "Apply Processing"
4. See results instantly!

### Export Results

Click PCD, PLY, or XYZ buttons to download processed point cloud

## 🎨 What You'll See

- **Beautiful UI** with blue gradient theme
- **3D Visualization** with interactive controls
- **Real-time Stats** showing FPS and point count
- **Processing Controls** with live parameter adjustment
- **Export Options** for multiple formats

## 📊 Test Data

The application includes test files:
- `public/demo_data/kitti_street_scene.pcd` - Urban scene (5K points)
- `public/demo_data/demo_pointcloud.pcd` - Simple cloud (1K points)
- `public/test_data/sample.pcd` - Minimal test file
- `public/test_data/sample.xyz` - XYZ format test

## 🐛 Troubleshooting

### Build Fails
```bash
rm -rf .next node_modules package-lock.json
npm install
npm run build
```

### Port Already in Use
```bash
npm run dev -- -p 3001
```

### WebGL Not Working
- Update your browser
- Enable hardware acceleration
- Try a different browser

## 📚 Next Steps

- Read the full [README.md](README.md)
- Check [DEPLOYMENT.md](DEPLOYMENT.md) for production deployment
- See [CHANGELOG.md](CHANGELOG.md) for version history

## 🎯 Key Commands

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm start          # Start production server
npm run lint       # Lint code
npm run type-check # Check TypeScript types
```

## 🌐 Browser Support

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

## 💡 Tips

1. **Use Demo Files**: Start with included demo files to test features
2. **Try Different Filters**: Each processing operation has different effects
3. **Adjust Parameters**: Use sliders to fine-tune processing
4. **Export Often**: Save your processed results in different formats
5. **Check FPS**: Monitor performance in top-right corner

## 🔗 Useful Links

- **GitHub**: https://github.com/sumeshthkr/autopointcloud
- **Issues**: https://github.com/sumeshthkr/autopointcloud/issues
- **Next.js Docs**: https://nextjs.org/docs
- **Three.js Docs**: https://threejs.org/docs

---

**Ready to deploy?** Run `npx vercel --prod` or `npx netlify-cli deploy --prod`!
