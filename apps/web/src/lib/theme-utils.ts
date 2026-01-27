/**
 * Theme Utilities for Organization Branding
 * Converts hex colors to HSL and applies them as CSS variables
 * Provides comprehensive theming across the entire application
 * Supports both light and dark modes with proper contrast
 */

export function applyBrandColors(colors: {
  primary?: string | null;
  secondary?: string | null;
  accent?: string | null;
}) {
  if (typeof window === 'undefined') return;

  const root = document.documentElement;

  // Only apply colors if they exist, otherwise use defaults
  if (colors.primary) {
    const rgb = hexToRGB(colors.primary);
    const hsl = hexToHSL(colors.primary);

    // Primary color and its variants (LIGHT MODE ONLY)
    root.style.setProperty('--primary', hsl);
    root.style.setProperty('--primary-rgb', rgb);

    // Light mode foreground (dark text on light background)
    root.style.setProperty('--primary-foreground', getContrastColor(colors.primary));

    // Primary shades (lighter and darker versions)
    root.style.setProperty('--primary-50', lighten(hsl, 95));
    root.style.setProperty('--primary-100', lighten(hsl, 90));
    root.style.setProperty('--primary-200', lighten(hsl, 80));
    root.style.setProperty('--primary-300', lighten(hsl, 70));
    root.style.setProperty('--primary-400', lighten(hsl, 60));
    root.style.setProperty('--primary-500', hsl); // Base color
    root.style.setProperty('--primary-600', darken(hsl, 10));
    root.style.setProperty('--primary-700', darken(hsl, 20));
    root.style.setProperty('--primary-800', darken(hsl, 30));
    root.style.setProperty('--primary-900', darken(hsl, 40));

    // NOTE: Dark mode uses universal black/gray theme (see globals.css)
    // Brand colors only apply to light mode and sidebar
  }

  if (colors.secondary) {
    const rgb = hexToRGB(colors.secondary);
    const hsl = hexToHSL(colors.secondary);

    root.style.setProperty('--secondary', hsl);
    root.style.setProperty('--secondary-rgb', rgb);
    root.style.setProperty('--secondary-foreground', getContrastColor(colors.secondary));

    // Secondary shades
    root.style.setProperty('--secondary-50', lighten(hsl, 95));
    root.style.setProperty('--secondary-100', lighten(hsl, 90));
    root.style.setProperty('--secondary-200', lighten(hsl, 80));
    root.style.setProperty('--secondary-300', lighten(hsl, 70));
    root.style.setProperty('--secondary-400', lighten(hsl, 60));
    root.style.setProperty('--secondary-500', hsl);
    root.style.setProperty('--secondary-600', darken(hsl, 10));
    root.style.setProperty('--secondary-700', darken(hsl, 20));
    root.style.setProperty('--secondary-800', darken(hsl, 30));
    root.style.setProperty('--secondary-900', darken(hsl, 40));
  }

  if (colors.accent) {
    const rgb = hexToRGB(colors.accent);
    const hsl = hexToHSL(colors.accent);

    root.style.setProperty('--accent', hsl);
    root.style.setProperty('--accent-rgb', rgb);
    root.style.setProperty('--accent-foreground', getContrastColor(colors.accent));

    // Use accent color for focus rings to maintain brand consistency
    root.style.setProperty('--ring', hsl);

    // Accent shades
    root.style.setProperty('--accent-50', lighten(hsl, 95));
    root.style.setProperty('--accent-100', lighten(hsl, 90));
    root.style.setProperty('--accent-200', lighten(hsl, 80));
    root.style.setProperty('--accent-300', lighten(hsl, 70));
    root.style.setProperty('--accent-400', lighten(hsl, 60));
    root.style.setProperty('--accent-500', hsl);
    root.style.setProperty('--accent-600', darken(hsl, 10));
    root.style.setProperty('--accent-700', darken(hsl, 20));
    root.style.setProperty('--accent-800', darken(hsl, 30));
    root.style.setProperty('--accent-900', darken(hsl, 40));
  }

  // Set border and input to use a subtle primary color tint for brand consistency
  if (colors.primary) {
    const primaryHsl = hexToHSL(colors.primary);
    const lightBorder = lighten(primaryHsl, 92); // Very light version for borders
    root.style.setProperty('--border', lightBorder);
    root.style.setProperty('--input', lightBorder);
  }

  console.log('[Theme] Brand colors applied successfully', { colors });
}

/**
 * Convert hex color to RGB format
 * Example: #2563eb -> "37 99 235"
 */
function hexToRGB(hex: string): string {
  hex = hex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `${r} ${g} ${b}`;
}

/**
 * Convert hex color to HSL format for CSS variables
 * Example: #2563eb -> "217 91% 60%"
 */
function hexToHSL(hex: string): string {
  // Remove # if present
  hex = hex.replace('#', '');

  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/**
 * Lighten an HSL color
 */
function lighten(hsl: string, lightness: number): string {
  const parts = hsl.split(' ');
  const h = parts[0];
  const s = parts[1];
  return `${h} ${s} ${lightness}%`;
}

/**
 * Darken an HSL color
 */
function darken(hsl: string, amount: number): string {
  const parts = hsl.split(' ');
  const h = parts[0];
  const s = parts[1];
  const l = parseInt(parts[2]);
  const newL = Math.max(0, l - amount);
  return `${h} ${s} ${newL}%`;
}

/**
 * Get contrasting text color (white or black) for a background color
 */
function getContrastColor(hex: string): string {
  hex = hex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return white for dark colors, black for light colors
  return luminance > 0.5 ? '0 0% 0%' : '0 0% 100%';
}

/**
 * Apply dark mode specific color overrides
 * Preserves the user's chosen color (hue AND saturation) but adjusts lightness
 * This ensures brand colors remain consistent in both light and dark modes
 */
function applyDarkModeColors(colorType: 'primary' | 'secondary' | 'accent', hsl: string) {
  // Remove existing dark mode style for this color type
  const styleId = `dark-mode-${colorType}-colors`;
  const existingStyle = document.getElementById(styleId);
  if (existingStyle) {
    existingStyle.remove();
  }

  // Extract HSL components
  const parts = hsl.split(' ');
  const h = parts[0]; // Hue (color identity)
  const s = parts[1]; // Saturation (color intensity)

  // Parse saturation value for calculations
  const saturationValue = parseInt(s.replace('%', ''));

  // For backgrounds, reduce saturation slightly to avoid overwhelming dark backgrounds
  // For very saturated colors (>70%), reduce to 60% of original
  // For less saturated colors, keep most of the saturation
  const bgSat = saturationValue > 70 ? Math.round(saturationValue * 0.6) : Math.round(saturationValue * 0.8);
  const subtleSat = Math.round(saturationValue * 0.3); // For borders/muted elements

  let darkModeCSS = '';

  if (colorType === 'primary') {
    // Primary color drives the overall dark theme
    // CRITICAL: Maintain user's color choice by preserving hue AND saturation
    // Using high specificity (html.dark) and !important to override globals.css
    darkModeCSS = `
      html.dark,
      .dark,
      :root.dark {
        /* Backgrounds - very dark with user's color (reduced saturation for comfort) */
        --background: ${h} ${bgSat}% 11% !important;
        --foreground: ${h} 15% 98% !important;

        /* Cards and surfaces - slightly lighter and more saturated than background */
        --card: ${h} ${bgSat}% 15% !important;
        --card-foreground: ${h} 15% 98% !important;

        /* Popovers and menus */
        --popover: ${h} ${bgSat}% 12% !important;
        --popover-foreground: ${h} 15% 98% !important;

        /* Primary interactive elements - bright with FULL user saturation */
        --primary: ${h} ${s} 65% !important;
        --primary-foreground: ${h} ${bgSat}% 10% !important;

        /* Muted elements - desaturated version of user's color */
        --muted: ${h} ${subtleSat}% 20% !important;
        --muted-foreground: ${h} 15% 70% !important;

        /* Borders and inputs - subtle with user's color tint */
        --border: ${h} ${subtleSat}% 25% !important;
        --input: ${h} ${subtleSat}% 25% !important;

        /* Focus ring - bright with full saturation */
        --ring: ${h} ${s} 60% !important;
      }
    `;
  } else if (colorType === 'secondary') {
    // Secondary maintains user's color saturation
    darkModeCSS = `
      html.dark,
      .dark,
      :root.dark {
        --secondary: ${h} ${bgSat}% 25% !important;
        --secondary-foreground: ${h} 15% 98% !important;
      }
    `;
  } else if (colorType === 'accent') {
    // Accent maintains user's color saturation
    darkModeCSS = `
      html.dark,
      .dark,
      :root.dark {
        --accent: ${h} ${bgSat}% 22% !important;
        --accent-foreground: ${h} ${s} 65% !important;
      }
    `;
  }

  // Create and inject style element with high specificity
  const styleElement = document.createElement('style');
  styleElement.id = styleId;
  styleElement.textContent = darkModeCSS;
  document.head.appendChild(styleElement);

  console.log(`[Theme] Applied dark mode ${colorType} color: ${h}° ${s} (bg saturation: ${bgSat}%)`);
}

/**
 * Reset to default RAYMOND colors and clean up any dynamic dark mode styles
 */
export function resetToDefaultColors() {
  const root = document.documentElement;

  // Remove all primary color variants
  root.style.removeProperty('--primary');
  root.style.removeProperty('--primary-rgb');
  root.style.removeProperty('--primary-foreground');
  root.style.removeProperty('--primary-50');
  root.style.removeProperty('--primary-100');
  root.style.removeProperty('--primary-200');
  root.style.removeProperty('--primary-300');
  root.style.removeProperty('--primary-400');
  root.style.removeProperty('--primary-500');
  root.style.removeProperty('--primary-600');
  root.style.removeProperty('--primary-700');
  root.style.removeProperty('--primary-800');
  root.style.removeProperty('--primary-900');

  // Remove secondary and its shades
  root.style.removeProperty('--secondary');
  root.style.removeProperty('--secondary-rgb');
  root.style.removeProperty('--secondary-foreground');
  root.style.removeProperty('--secondary-50');
  root.style.removeProperty('--secondary-100');
  root.style.removeProperty('--secondary-200');
  root.style.removeProperty('--secondary-300');
  root.style.removeProperty('--secondary-400');
  root.style.removeProperty('--secondary-500');
  root.style.removeProperty('--secondary-600');
  root.style.removeProperty('--secondary-700');
  root.style.removeProperty('--secondary-800');
  root.style.removeProperty('--secondary-900');

  // Remove accent and its shades
  root.style.removeProperty('--accent');
  root.style.removeProperty('--accent-rgb');
  root.style.removeProperty('--accent-foreground');
  root.style.removeProperty('--accent-50');
  root.style.removeProperty('--accent-100');
  root.style.removeProperty('--accent-200');
  root.style.removeProperty('--accent-300');
  root.style.removeProperty('--accent-400');
  root.style.removeProperty('--accent-500');
  root.style.removeProperty('--accent-600');
  root.style.removeProperty('--accent-700');
  root.style.removeProperty('--accent-800');
  root.style.removeProperty('--accent-900');

  // Remove ring, border, and input
  root.style.removeProperty('--ring');
  root.style.removeProperty('--border');
  root.style.removeProperty('--input');

  // CRITICAL: Remove ALL dynamic dark mode style elements (from previous attempts)
  const darkModeStyles = ['dark-mode-primary-colors', 'dark-mode-secondary-colors', 'dark-mode-accent-colors'];
  darkModeStyles.forEach(styleId => {
    const styleElement = document.getElementById(styleId);
    if (styleElement) {
      styleElement.remove();
      console.log(`[Theme] Removed dynamic style: ${styleId}`);
    }
  });

  console.log('[Theme] Reset to default RAYMOND colors and cleaned up dynamic styles');
}

/**
 * Clean up any leftover dynamic dark mode styles on page load
 * Call this when the app initializes to ensure clean slate
 */
export function cleanupDynamicStyles() {
  const darkModeStyles = ['dark-mode-primary-colors', 'dark-mode-secondary-colors', 'dark-mode-accent-colors'];
  darkModeStyles.forEach(styleId => {
    const styleElement = document.getElementById(styleId);
    if (styleElement) {
      styleElement.remove();
      console.log(`[Theme] Cleaned up leftover dynamic style: ${styleId}`);
    }
  });
}
