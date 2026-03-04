import { teamsLightTheme } from '@fluentui/react-components'

const wcagTypography = {
  fontSizeBase100: '14px',
  fontSizeBase200: '15px',
  fontSizeBase300: '16px',
  fontSizeBase400: '18px',
  fontSizeBase500: '20px',
  fontSizeBase600: '24px',
  lineHeightBase100: '20px',
  lineHeightBase200: '22px',
  lineHeightBase300: '24px',
  lineHeightBase400: '28px',
  lineHeightBase500: '32px',
  lineHeightBase600: '36px'
}

export const accessibleTheme = {
  ...teamsLightTheme,
  ...wcagTypography
}
