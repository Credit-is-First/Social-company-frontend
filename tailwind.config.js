/**
 * The installed Tailwind is 1.9.6 (the project is offline, so it cannot be
 * upgraded), but the components are written with Tailwind 2/3 class names.
 * This config backfills those classes on top of 1.9 so they generate CSS
 * instead of silently doing nothing. scripts/tailwind-jit.js covers the rest
 * (arbitrary values, opacity modifiers, newer variants).
 *
 * Two 1.9 rules shape how it is written:
 * - `theme.extend` merges only one level deep, so extending a colour such as
 *   `gray` must spread the default shades back in or they are lost.
 * - There is no `variants.extend`; a `variants` entry replaces the default
 *   list, so each one below repeats the 1.9 defaults before adding to them.
 *
 * Four 1.9 core plugins are replaced (see `corePlugins`) because their
 * Tailwind 3 behaviour cannot be layered on top:
 * - boxShadow:          shadows compose with rings and accept shadow-{colour}
 * - gradientColorStops: from/via/to accept stop positions (from-10%)
 * - translate/rotate/scale/skew: work on their own, without the `transform` class
 */
const plugin = require('tailwindcss/plugin');
const flattenColorPalette = require('tailwindcss/lib/util/flattenColorPalette').default;

/**
 * Tailwind 4's palette (tailwindcss@4.3.3), converted from its published OKLCH
 * values to hex in tailwind.palette.js. It replaces 1.9's palette outright, so
 * `blue-500` is Tailwind 4's #2b7fff, not 1.9's #4299e1. scripts/tailwind-jit.js
 * reads colours from here too.
 */
const { colors } = require('./tailwind.palette');

// The default ring / focus colour: Tailwind 4's blue-500 at 50% opacity.
const FOCUS_BLUE = () => `rgba(${hexToRgb(colors.blue[500])}, 0.5)`;

// Lets an empty value stand in for "unset" inside var() chains.
const EMPTY = 'var(--tw-empty, /*!*/ /*!*/)';

function hexToRgb(hex) {
  const value = hex.replace('#', '');
  const full = value.length === 3 ? value.split('').map(c => c + c).join('') : value;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(', ');
}

const isHex = value => /^#[0-9a-f]{3,6}$/i.test(value);

/** Tailwind 1.9's class naming: `default` drops the suffix, `-45` becomes `-rotate-45`. */
function className(prefix, key) {
  if (key === 'default' || key === 'DEFAULT') return prefix;
  if (String(key).charAt(0) === '-') return `-${prefix}${key}`;
  return `${prefix}-${key}`;
}

/**
 * Tailwind 2's ring utilities (ring-*, ring-{color}, ring-opacity-*,
 * ring-offset-*, ring-offset-{color}), built on the same CSS variables so
 * width, colour, opacity and offset combine the way they do upstream.
 */
const ringPlugin = plugin(({ addBase, addUtilities, theme, variants }) => {
  addBase({
    '*, ::before, ::after': {
      '--tw-ring-inset': EMPTY,
      '--tw-ring-offset-width': '0px',
      '--tw-ring-offset-color': '#fff',
      '--tw-ring-color': FOCUS_BLUE(),
      '--tw-ring-offset-shadow': '0 0 #0000',
      '--tw-ring-shadow': '0 0 #0000',
    },
  });

  const widths = theme('ringWidth');
  const ringWidth = {};
  Object.keys(widths).forEach(key => {
    const suffix = key === 'DEFAULT' ? '' : `-${key}`;
    ringWidth[`.ring${suffix}`] = {
      '--tw-ring-offset-shadow':
        'var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color)',
      '--tw-ring-shadow': `var(--tw-ring-inset) 0 0 0 calc(${widths[key]} + var(--tw-ring-offset-width)) var(--tw-ring-color)`,
      'box-shadow': 'var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow, 0 0 #0000)',
    };
  });
  ringWidth['.ring-inset'] = { '--tw-ring-inset': 'inset' };

  const palette = flattenColorPalette(theme('colors'));
  const ringColor = {};
  const ringOffsetColor = {};
  Object.keys(palette).forEach(name => {
    const value = palette[name];
    ringOffsetColor[`.ring-offset-${name}`] = { '--tw-ring-offset-color': value };
    ringColor[`.ring-${name}`] = isHex(value)
      ? { '--tw-ring-opacity': '1', '--tw-ring-color': `rgba(${hexToRgb(value)}, var(--tw-ring-opacity))` }
      : { '--tw-ring-color': value };
  });

  const opacities = theme('opacity');
  const ringOpacity = {};
  Object.keys(opacities).forEach(key => {
    ringOpacity[`.ring-opacity-${key}`] = { '--tw-ring-opacity': opacities[key] };
  });

  const offsets = theme('ringOffsetWidth');
  const ringOffsetWidth = {};
  Object.keys(offsets).forEach(key => {
    ringOffsetWidth[`.ring-offset-${key}`] = { '--tw-ring-offset-width': offsets[key] };
  });

  const ringVariants = variants('ring', ['responsive', 'focus-within', 'focus']);
  addUtilities(ringWidth, ringVariants);
  addUtilities(ringColor, ringVariants);
  addUtilities(ringOpacity, ringVariants);
  addUtilities(ringOffsetWidth, ringVariants);
  addUtilities(ringOffsetColor, ringVariants);
});

/**
 * Replaces 1.9's boxShadow plugin with Tailwind 3's: shadows go through
 * --tw-shadow so they stack with rings, and shadow-{colour} recolours them.
 */
const shadowPlugin = plugin(({ addBase, addUtilities, e, theme, variants }) => {
  addBase({
    '*, ::before, ::after': {
      '--tw-shadow': '0 0 #0000',
      '--tw-shadow-colored': '0 0 #0000',
    },
  });

  const compose = 'var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow)';

  // Swap each layer's colour for var(--tw-shadow-color).
  const colored = value => value
    .split(/,(?![^(]*\))/)
    .map(layer => {
      const trimmed = layer.trim();
      const swapped = trimmed.replace(/(rgba?\([^)]*\)|hsla?\([^)]*\)|#[0-9a-f]{3,8})\s*$/i, 'var(--tw-shadow-color)');
      return swapped === trimmed ? `${trimmed} var(--tw-shadow-color)` : swapped;
    })
    .join(', ');

  const sizes = {};
  const scale = theme('boxShadow');
  Object.keys(scale).forEach(key => {
    const value = scale[key];
    sizes[`.${e(className('shadow', key))}`] = value === 'none'
      ? { '--tw-shadow': '0 0 #0000', '--tw-shadow-colored': '0 0 #0000', 'box-shadow': compose }
      : { '--tw-shadow': value, '--tw-shadow-colored': colored(value), 'box-shadow': compose };
  });

  const palette = flattenColorPalette(theme('colors'));
  const shadowColors = {};
  Object.keys(palette).forEach(name => {
    if (scale[name] !== undefined) return; // A size name wins over a colour name.
    shadowColors[`.${e(`shadow-${name}`)}`] = {
      '--tw-shadow-color': palette[name],
      '--tw-shadow': 'var(--tw-shadow-colored)',
    };
  });

  addUtilities(sizes, variants('boxShadow'));
  addUtilities(shadowColors, variants('boxShadow'));
});

/**
 * Replaces 1.9's gradientColorStops plugin with Tailwind 3.3's, which adds
 * stop positions: `from-sky-500 from-10% via-30% to-90%`.
 */
const gradientPlugin = plugin(({ addBase, addUtilities, e, theme, variants }) => {
  addBase({
    '*, ::before, ::after': {
      '--tw-gradient-from-position': EMPTY,
      '--tw-gradient-via-position': EMPTY,
      '--tw-gradient-to-position': EMPTY,
    },
  });

  const clear = value => (isHex(value) ? `rgba(${hexToRgb(value)}, 0)` : 'rgba(255, 255, 255, 0)');
  const palette = flattenColorPalette(theme('colors'));
  const from = {};
  const via = {};
  const to = {};
  Object.keys(palette).forEach(name => {
    const value = palette[name];
    from[`.${e(`from-${name}`)}`] = {
      '--tw-gradient-from': `${value} var(--tw-gradient-from-position)`,
      '--tw-gradient-to': `${clear(value)} var(--tw-gradient-to-position)`,
      '--tw-gradient-stops': 'var(--tw-gradient-from), var(--tw-gradient-to)',
    };
    via[`.${e(`via-${name}`)}`] = {
      '--tw-gradient-to': `${clear(value)} var(--tw-gradient-to-position)`,
      '--tw-gradient-stops': `var(--tw-gradient-from), ${value} var(--tw-gradient-via-position), var(--tw-gradient-to)`,
    };
    to[`.${e(`to-${name}`)}`] = {
      '--tw-gradient-to': `${value} var(--tw-gradient-to-position)`,
    };
  });

  const positions = {};
  for (let p = 0; p <= 100; p += 5) {
    ['from', 'via', 'to'].forEach(stop => {
      positions[`.${e(`${stop}-${p}%`)}`] = { [`--tw-gradient-${stop}-position`]: `${p}%` };
    });
  }

  // Order matters: a later `to-*` must override the `--tw-gradient-to` a `from-*` sets.
  const stopVariants = variants('gradientColorStops');
  addUtilities(from, stopVariants);
  addUtilities(via, stopVariants);
  addUtilities(to, stopVariants);
  addUtilities(positions, stopVariants);
});

/**
 * Replaces 1.9's translate/rotate/scale/skew plugins so each utility applies
 * the transform itself. In 1.9 they only set variables and need `transform`
 * alongside; Tailwind 3 does not. The `transform` class still works.
 */
const transformPlugin = plugin(({ addBase, addUtilities, e, theme, variants }) => {
  addBase({
    '*, ::before, ::after': {
      '--transform-translate-x': '0',
      '--transform-translate-y': '0',
      '--transform-rotate': '0',
      '--transform-skew-x': '0',
      '--transform-skew-y': '0',
      '--transform-scale-x': '1',
      '--transform-scale-y': '1',
    },
  });

  const transform = 'translateX(var(--transform-translate-x)) translateY(var(--transform-translate-y)) ' +
    'rotate(var(--transform-rotate)) skewX(var(--transform-skew-x)) skewY(var(--transform-skew-y)) ' +
    'scaleX(var(--transform-scale-x)) scaleY(var(--transform-scale-y))';

  const build = (themeKey, groups) => {
    const utilities = {};
    const scale = theme(themeKey);
    groups.forEach(([prefix, props]) => {
      Object.keys(scale).forEach(key => {
        const rule = {};
        props.forEach(prop => { rule[prop] = scale[key]; });
        rule.transform = transform;
        utilities[`.${e(className(prefix, key))}`] = rule;
      });
    });
    addUtilities(utilities, variants(themeKey));
  };

  build('translate', [['translate-x', ['--transform-translate-x']], ['translate-y', ['--transform-translate-y']]]);
  build('rotate', [['rotate', ['--transform-rotate']]]);
  build('skew', [['skew-x', ['--transform-skew-x']], ['skew-y', ['--transform-skew-y']]]);
  build('scale', [
    ['scale', ['--transform-scale-x', '--transform-scale-y']],
    ['scale-x', ['--transform-scale-x']],
    ['scale-y', ['--transform-scale-y']],
  ]);

  // 1.9's own transform-none comes from the core `transform` plugin, which is
  // emitted before these utilities and so could not cancel them. Re-declared
  // here, after them, it wins again: `translate-x-4 md:transform-none` works.
  addUtilities({ '.transform-none': { transform: 'none' } }, variants('transform'));
});

/** Tailwind 3 border and radius utilities 1.9 lacks: border-x/y/s/e, rounded-s/e/ss/se/es/ee. */
const bordersPlugin = plugin(({ addUtilities, e, theme, variants }) => {
  const widths = theme('borderWidth');
  const sides = {
    'border-x': ['border-left-width', 'border-right-width'],
    'border-y': ['border-top-width', 'border-bottom-width'],
    'border-s': ['border-inline-start-width'],
    'border-e': ['border-inline-end-width'],
  };
  const borderUtilities = {};
  Object.keys(sides).forEach(prefix => {
    Object.keys(widths).forEach(key => {
      const rule = {};
      sides[prefix].forEach(prop => { rule[prop] = widths[key]; });
      borderUtilities[`.${e(className(prefix, key))}`] = rule;
    });
  });
  addUtilities(borderUtilities, variants('borderWidth'));

  const radii = theme('borderRadius');
  const corners = {
    'rounded-s': ['border-start-start-radius', 'border-end-start-radius'],
    'rounded-e': ['border-start-end-radius', 'border-end-end-radius'],
    'rounded-ss': ['border-start-start-radius'],
    'rounded-se': ['border-start-end-radius'],
    'rounded-ee': ['border-end-end-radius'],
    'rounded-es': ['border-end-start-radius'],
  };
  const radiusUtilities = {};
  Object.keys(corners).forEach(prefix => {
    Object.keys(radii).forEach(key => {
      const rule = {};
      corners[prefix].forEach(prop => { rule[prop] = radii[key]; });
      radiusUtilities[`.${e(className(prefix, key))}`] = rule;
    });
  });
  addUtilities(radiusUtilities, variants('borderRadius'));
});

/** Tailwind 3's line-clamp-{1..6} and line-clamp-none. */
const lineClampPlugin = plugin(({ addUtilities, variants }) => {
  // line-clamp-none undoes all four properties, so `line-clamp-3 md:line-clamp-none`
  // really unclamps (as Tailwind 3.3 does).
  const utilities = {
    '.line-clamp-none': {
      overflow: 'visible',
      display: 'block',
      '-webkit-box-orient': 'horizontal',
      '-webkit-line-clamp': 'none',
    },
  };
  [1, 2, 3, 4, 5, 6].forEach(lines => {
    utilities[`.line-clamp-${lines}`] = {
      overflow: 'hidden',
      display: '-webkit-box',
      '-webkit-box-orient': 'vertical',
      '-webkit-line-clamp': String(lines),
    };
  });
  addUtilities(utilities, variants('lineClamp', ['responsive']));
});

/** Small Tailwind 2/3 renames and additions. */
const miscPlugin = plugin(({ addBase, addUtilities, theme, variants }) => {
  // 1.9's base styles hard-code its old gray-500 (#a0aec0) for placeholders;
  // use the new palette's gray-400 instead.
  addBase({
    'input::placeholder, textarea::placeholder': { color: theme('colors.gray.400') },
  });
  addUtilities(
    {
      // Tailwind 2 renamed whitespace-no-wrap to whitespace-nowrap.
      '.whitespace-nowrap': { 'white-space': 'nowrap' },
      '.overflow-clip': { overflow: 'clip' },
      '.overflow-x-clip': { 'overflow-x': 'clip' },
      '.overflow-y-clip': { 'overflow-y': 'clip' },
    },
    variants('whitespace', ['responsive']),
  );
});

// Tailwind 3's intrinsic and viewport sizes.
const intrinsic = { fit: 'fit-content', min: 'min-content', max: 'max-content' };
const viewportHeights = { svh: '100svh', lvh: '100lvh', dvh: '100dvh' };
const viewportWidths = { svw: '100svw', lvw: '100lvw', dvw: '100dvw' };

module.exports = {
  // Production builds drop every utility not found in these files. Tailwind 1.9
  // only purges when NODE_ENV=production, so `npm start` still has everything.
  // Keep class names whole in source (no `bg-${color}-500`), or they get purged.
  purge: {
    mode: 'layers',
    // Only Tailwind's utilities: base styles (incl. the ring variables) stay,
    // and index.css / tailwind-jit.css are outside Tailwind's layers anyway.
    layers: ['utilities'],
    content: [
      './src/**/*.{js,jsx,ts,tsx}',
      './public/index.html',
    ],
  },
  corePlugins: {
    // Replaced by the plugins above with Tailwind 3 behaviour.
    boxShadow: false,
    gradientColorStops: false,
    translate: false,
    rotate: false,
    scale: false,
    skew: false,
  },
  theme: {
    // Custom theme keys consumed by the plugins above.
    ringWidth: {
      DEFAULT: '3px',
      0: '0px',
      1: '1px',
      2: '2px',
      4: '4px',
      8: '8px',
    },
    ringOffsetWidth: {
      0: '0px',
      1: '1px',
      2: '2px',
      4: '4px',
      8: '8px',
    },
    // Replaces 1.9's palette entirely (not `extend`), so no 1.9 shade survives.
    colors,
    extend: {
      // Tailwind 3's default border colour, gray-200 (1.9 used gray-300).
      borderColor: {
        default: colors.gray[200],
      },
      // 1.9's focus style (Tailwind 3+ dropped it), recoloured to the new blue-500.
      boxShadow: {
        outline: `0 0 0 3px ${FOCUS_BLUE()}`,
      },
      // Tailwind 2 half steps.
      spacing: {
        '0.5': '0.125rem',
        '1.5': '0.375rem',
        '2.5': '0.625rem',
        '3.5': '0.875rem',
        // Steps Tailwind 2 added to the scale (w-80, p-7, gap-14, …).
        7: '1.75rem',
        9: '2.25rem',
        11: '2.75rem',
        14: '3.5rem',
        28: '7rem',
        36: '9rem',
        44: '11rem',
        52: '13rem',
        60: '15rem',
        72: '18rem',
        80: '20rem',
        96: '24rem',
      },
      // 1.9 only has inset-0 / inset-auto; Tailwind 2 accepts the spacing scale.
      inset: theme => ({
        ...theme('spacing'),
        '1/2': '50%',
        full: '100%',
      }),
      opacity: {
        5: '0.05',
        10: '0.1',
        20: '0.2',
        30: '0.3',
        40: '0.4',
        60: '0.6',
        70: '0.7',
        80: '0.8',
        90: '0.9',
        95: '0.95',
      },
      fontSize: {
        '7xl': '4.5rem',
        '8xl': '6rem',
        '9xl': '8rem',
      },
      width: {
        ...intrinsic,
        ...viewportWidths,
      },
      height: {
        ...intrinsic,
        ...viewportHeights,
      },
      minWidth: theme => ({
        ...theme('spacing'),
        ...intrinsic,
        '[300px]': '300px',
      }),
      minHeight: theme => ({
        ...theme('spacing'),
        ...intrinsic,
        ...viewportHeights,
      }),
      maxWidth: {
        '7xl': '80rem',
        prose: '65ch',
        ...intrinsic,
      },
      maxHeight: theme => ({
        ...theme('spacing'),
        ...intrinsic,
        ...viewportHeights,
        'screen-90': '90vh',
      }),
      // Point gradients at the stop variables gradientPlugin sets.
      backgroundImage: {
        'gradient-to-t': 'linear-gradient(to top, var(--tw-gradient-stops))',
        'gradient-to-tr': 'linear-gradient(to top right, var(--tw-gradient-stops))',
        'gradient-to-r': 'linear-gradient(to right, var(--tw-gradient-stops))',
        'gradient-to-br': 'linear-gradient(to bottom right, var(--tw-gradient-stops))',
        'gradient-to-b': 'linear-gradient(to bottom, var(--tw-gradient-stops))',
        'gradient-to-bl': 'linear-gradient(to bottom left, var(--tw-gradient-stops))',
        'gradient-to-l': 'linear-gradient(to left, var(--tw-gradient-stops))',
        'gradient-to-tl': 'linear-gradient(to top left, var(--tw-gradient-stops))',
      },
    },
  },
  variants: {
    // 1.9 defaults, plus the variants the components use.
    backgroundColor: ['responsive', 'group-hover', 'hover', 'focus', 'disabled'],
    borderColor: ['responsive', 'hover', 'focus', 'disabled'],
    borderWidth: ['responsive', 'first', 'last'],
    cursor: ['responsive', 'disabled'],
    opacity: ['responsive', 'group-hover', 'hover', 'focus', 'disabled'],
    textColor: ['responsive', 'group-hover', 'hover', 'focus', 'disabled'],
    zIndex: ['responsive', 'focus'],
    ring: ['responsive', 'focus-within', 'focus'],
  },
  plugins: [
    ringPlugin,
    shadowPlugin,
    gradientPlugin,
    transformPlugin,
    bordersPlugin,
    lineClampPlugin,
    miscPlugin,
  ],
}
