# TweakCN Theme Integration Guide

A complete guide for integrating custom TweakCN themes into your Kaizen application.

## Overview

TweakCN is a visual no-code theme editor specifically designed for shadcn/ui components. It allows you to create custom themes with real-time preview and export them for use in your project. This guide will walk you through the entire process of creating and integrating a TweakCN theme into your Kaizen app.

## What You'll Learn

- How to create a custom theme using TweakCN
- How to export and integrate the theme into Kaizen
- How to maintain your custom theme
- Troubleshooting common issues

## Prerequisites

- Your Kaizen app should be running (follow `guides/running-locally.md`)
- Basic understanding of CSS custom properties (CSS variables)
- Access to a web browser

## Step 1: Analyze Your Current Theme

Before creating a new theme, let's understand what we're working with:

### Current Theme Structure
Kaizen uses a custom Apple-inspired theme with:
- **Base Colors**: Apple Blue (#0071e3), Apple Gray (#f5f5f7)
- **CSS Variables**: Defined in `app/app.css`
- **TailwindCSS v4**: With custom color mappings
- **shadcn/ui Components**: New York style with neutral base

### Current Color Palette
```css
:root {
  --primary: #0071e3;        /* Apple Blue */
  --secondary: #f5f5f7;      /* Apple Light Gray */
  --accent: #0071e3;         /* Apple Blue */
  --destructive: #ff3b30;    /* Apple Red */
  --muted: #f5f5f7;          /* Light Gray */
  --border: #e2e2e7;         /* Subtle border */
  /* ... and more */
}
```

## Step 2: Create Your Theme with TweakCN

### 2.1 Access the TweakCN Editor

1. Open your web browser and navigate to: [https://tweakcn.com/editor/theme](https://tweakcn.com/editor/theme)
2. You'll see the TweakCN theme editor interface

### 2.2 Understand the Interface

The editor provides several sections:
- **Color Categories**: Primary, Secondary, Accent, Base, Card, Popover, Muted, Destructive, Border & Input, Chart, Sidebar
- **Preview Panel**: Real-time preview of your changes
- **Export Options**: Share, Save, Code buttons

### 2.3 Create Your Custom Theme

#### Option A: Start from Scratch
1. **Primary Colors**: Click on the primary color picker
2. **Choose Your Brand Color**: Select a color that represents your brand
3. **Adjust Secondary Colors**: Pick complementary colors
4. **Set Accent Colors**: Choose colors for highlights and call-to-actions
5. **Configure Base Colors**: Set background and foreground colors
6. **Customize Other Elements**: Adjust cards, popovers, muted colors, etc.

#### Option B: Modify Existing Apple Theme
1. **Match Current Colors**: Start by replicating the current Apple theme
2. **Make Gradual Changes**: Adjust colors incrementally
3. **Test Different Combinations**: Use the preview to see changes

### 2.4 Key Design Considerations

- **Accessibility**: Ensure proper contrast ratios
- **Brand Consistency**: Align with your brand guidelines
- **Dark Mode**: Consider how colors work in dark mode
- **Component Harmony**: Ensure all components work well together

## Step 3: Export Your Theme

### 3.1 Export the Theme Code

1. **Click the "Code" Button**: In the TweakCN editor
2. **Copy the Generated Code**: This will be CSS variables and color definitions
3. **Note the Format**: TweakCN exports in OKLCH format with CSS variables

### 3.2 Expected Export Format

Your export will look similar to this:
```css
:root {
  --background: oklch(98% 0.005 250);
  --foreground: oklch(15% 0.005 250);
  --primary: oklch(65% 0.2 250);
  --primary-foreground: oklch(98% 0.005 250);
  /* ... more variables */
}

.dark {
  --background: oklch(15% 0.005 250);
  --foreground: oklch(98% 0.005 250);
  /* ... dark mode variables */
}
```

## Step 4: Integrate the Theme into Kaizen

### 4.1 Backup Your Current Theme

Before making changes, create a backup:

```bash
cp app/app.css app/app.css.backup
```

### 4.2 Method 1: Replace Existing Theme (Recommended)

1. **Open** `app/app.css`
2. **Locate the `:root` Section** (lines 46-99)
3. **Replace the Color Variables** with your TweakCN export
4. **Update the Dark Mode Section** (lines 129-138) if provided

#### Example Integration:
```css
:root {
  /* TweakCN Generated Colors */
  --background: oklch(98% 0.005 250);
  --foreground: oklch(15% 0.005 250);
  --primary: oklch(65% 0.2 250);
  --primary-foreground: oklch(98% 0.005 250);
  --secondary: oklch(96% 0.01 250);
  --secondary-foreground: oklch(20% 0.005 250);
  
  /* Keep existing Apple fonts and other properties */
  --font-apple-system: -apple-system, BlinkMacSystemFont, "San Francisco", "Helvetica Neue", Helvetica, sans-serif;
  --font-sf-mono: "SF Mono", Menlo, monospace;
  --radius: 10px;
  /* ... keep other non-color properties */
}
```

### 4.3 Method 2: Create a Theme Switcher (Advanced)

For multiple themes, create a theme switching system:

1. **Create Theme Files**:
```bash
mkdir app/themes
touch app/themes/default.css
touch app/themes/tweakcn.css
```

2. **Move Themes to Separate Files**:
```css
/* app/themes/tweakcn.css */
:root {
  /* Your TweakCN theme variables */
}
```

3. **Update Theme Loading Logic** (requires additional implementation)

### 4.4 Handle Color Format Conversion

TweakCN uses OKLCH format, which is modern but might need fallbacks:

```css
:root {
  /* Fallback colors for older browsers */
  --primary: #4f46e5;
  --primary: oklch(65% 0.2 250);
  
  /* Or convert OKLCH to HSL/RGB if needed */
  --primary: hsl(250, 80%, 65%);
}
```

## Step 5: Test Your Integration

### 5.1 Start the Development Server

```bash
npm run dev
```

### 5.2 Check for Visual Changes

1. **Open** your browser to `http://localhost:5173`
2. **Navigate through the app**:
   - Homepage
   - Dashboard (if auth is enabled)
   - Components and buttons
3. **Test Both Light and Dark Modes** (if applicable)
4. **Check Different Screen Sizes** (responsive design)

### 5.3 Test Key Components

Focus on these critical components:
- **Buttons**: Primary, secondary, destructive
- **Cards**: Background and borders
- **Navigation**: Sidebar and menu items
- **Forms**: Input fields and labels
- **Interactive Elements**: Hover and focus states

## Step 6: Fine-tune and Optimize

### 6.1 Address Common Issues

#### Issue: Colors Don't Match Preview
- **Solution**: Ensure proper OKLCH to RGB conversion
- **Check**: Browser support for OKLCH colors
- **Fix**: Add fallback colors

#### Issue: Dark Mode Not Working
- **Solution**: Ensure dark mode variables are properly defined
- **Check**: The `.dark` class is applied correctly
- **Fix**: Update dark mode color mappings

#### Issue: Component Contrast Issues
- **Solution**: Adjust foreground/background ratios
- **Check**: Accessibility contrast ratios (4.5:1 minimum)
- **Fix**: Use tools like WebAIM contrast checker

### 6.2 Optimize Performance

1. **Minimize CSS**: Remove unused color variables
2. **Group Related Properties**: Keep theme variables together
3. **Use CSS Custom Properties Efficiently**: Avoid excessive nesting

### 6.3 Document Your Theme

Create a comment section in your CSS:

```css
/* =========================== */
/* TWEAKCN CUSTOM THEME        */
/* =========================== */
/* 
 * Theme Name: [Your Theme Name]
 * Created: [Date]
 * TweakCN Export: [Link to export/config]
 * 
 * Color Palette:
 * - Primary: [Color description]
 * - Secondary: [Color description]
 * - Accent: [Color description]
 */
```

## Step 7: Advanced Customization

### 7.1 Customize Individual Components

You can override specific component styles:

```css
/* Custom button overrides */
.btn-primary {
  background: var(--primary);
  color: var(--primary-foreground);
  border-radius: var(--radius);
}

/* Custom card styling */
.card {
  background: var(--card);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
}
```

### 7.2 Create Theme Variants

For different sections or features:

```css
/* Marketing page variant */
.marketing-section {
  --primary: oklch(70% 0.15 200);
  --accent: oklch(75% 0.12 160);
}

/* Dashboard variant */
.dashboard-section {
  --primary: oklch(60% 0.18 280);
  --secondary: oklch(95% 0.02 280);
}
```

### 7.3 Animation and Transitions

Enhance your theme with smooth transitions:

```css
/* Smooth color transitions */
* {
  transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}

/* Custom hover effects */
.btn:hover {
  background: color-mix(in oklch, var(--primary) 90%, white);
}
```

## Step 8: Maintenance and Updates

### 8.1 Version Control Your Theme

1. **Commit Your Changes**:
```bash
git add app/app.css
git commit -m "Add TweakCN custom theme integration"
```

2. **Tag Theme Versions**:
```bash
git tag -a theme-v1.0 -m "Initial TweakCN theme integration"
```

### 8.2 Update Process

When updating your theme:

1. **Create a New TweakCN Theme**
2. **Export and Test** in a separate branch
3. **Compare Changes** with your current theme
4. **Merge Carefully** to avoid breaking changes

### 8.3 Backup Strategy

- **Keep Original Theme**: Always maintain the original `app.css.backup`
- **Document Changes**: Keep a changelog of theme modifications
- **Export Configurations**: Save your TweakCN configurations

## Troubleshooting

### Common Issues and Solutions

#### Theme Not Applying
- **Check**: CSS syntax errors
- **Verify**: File paths and imports
- **Ensure**: Development server is running

#### Colors Look Different
- **Issue**: Browser OKLCH support
- **Solution**: Add RGB/HSL fallbacks
- **Test**: Multiple browsers and devices

#### Dark Mode Issues
- **Check**: Dark mode toggle functionality
- **Verify**: `.dark` class application
- **Ensure**: All color variables have dark variants

#### Component Styling Conflicts
- **Issue**: Specificity conflicts
- **Solution**: Use CSS custom properties correctly
- **Check**: Component-specific overrides

### Getting Help

1. **Check TweakCN Documentation**: [https://tweakcn.com](https://tweakcn.com)
2. **Review shadcn/ui Theming**: [https://ui.shadcn.com/themes](https://ui.shadcn.com/themes)
3. **TweakCN GitHub Issues**: [https://github.com/jnsahaj/tweakcn/issues](https://github.com/jnsahaj/tweakcn/issues)
4. **Community Support**: shadcn/ui Discord or Reddit communities

## Best Practices

### Design Principles

1. **Consistency**: Use a limited color palette
2. **Accessibility**: Maintain proper contrast ratios
3. **Performance**: Minimize CSS custom property usage
4. **Maintainability**: Document your theme choices

### Development Workflow

1. **Test Incrementally**: Make small changes and test
2. **Use Version Control**: Commit theme changes regularly
3. **Mobile First**: Test on mobile devices first
4. **Cross-browser**: Verify across different browsers

### Future Considerations

- **Theme Switching**: Consider adding multiple theme support
- **User Preferences**: Allow users to customize themes
- **Dark Mode**: Ensure robust dark mode support
- **Accessibility**: Follow WCAG guidelines

## Conclusion

You've successfully integrated a TweakCN theme into your Kaizen application! Your app now has a unique visual identity that stands out from the default shadcn/ui appearance.

### What You've Accomplished

- ✅ Created a custom theme using TweakCN
- ✅ Exported and integrated the theme into Kaizen
- ✅ Tested the theme across different components
- ✅ Set up a maintenance strategy

### Next Steps

- **Iterate**: Refine your theme based on user feedback
- **Expand**: Consider creating multiple theme variants
- **Share**: Document your theme for team members
- **Maintain**: Keep your theme updated with new features

Remember, theming is an iterative process. Don't be afraid to experiment and refine your design until it perfectly matches your vision!

---

**Need help?** Check the troubleshooting section or reach out to the community for support.