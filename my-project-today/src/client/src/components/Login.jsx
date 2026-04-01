import React, { useEffect } from 'react'
import { useMsal, useIsAuthenticated } from '../auth/useAuth'
import { loginRequest } from '../auth/msalConfig'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  FluentProvider,
  Card,
  CardHeader,
  Button,
  Text,
  Title3,
  makeStyles,
  tokens
} from '@fluentui/react-components'
import { PersonRegular } from '@fluentui/react-icons'
import { accessibleTheme } from '../theme/accessibleTheme'

const useStyles = makeStyles({
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.colorNeutralBackground2,
    padding: tokens.spacingVerticalXXL
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    padding: tokens.spacingVerticalXXL,
    boxShadow: tokens.shadow16
  },
  header: {
    marginBottom: tokens.spacingVerticalXXL,
    textAlign: 'center'
  },
  title: {
    marginBottom: tokens.spacingVerticalL,
    lineHeight: '1.3',
    fontWeight: tokens.fontWeightSemibold
  },
  description: {
    color: tokens.colorNeutralForeground2,
    lineHeight: '1.6',
    fontSize: tokens.fontSizeBase300,
    textAlign: 'center',
    display: 'block'
  },
  buttonContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: tokens.spacingVerticalXL
  },
  button: {
    minWidth: '200px'
  }
})

export default function Login() {
  const { instance, accounts } = useMsal()
  const isAuthenticated = useIsAuthenticated()
  const navigate = useNavigate()
  const location = useLocation()
  const styles = useStyles()

  const from = (location.state && location.state.from && location.state.from.pathname) || '/'

  useEffect(() => {
    console.debug('Login: useEffect accounts/isAuthenticated', { accounts, isAuthenticated })
    if (accounts && accounts.length > 0) {
      console.debug('Login: setting active account from accounts[0]')
      instance.setActiveAccount(accounts[0])
      navigate(from, { replace: true })
    } else if (isAuthenticated) {
      console.debug('Login: isAuthenticated true, navigating to', from)
      navigate(from, { replace: true })
    }
  }, [accounts, instance, isAuthenticated, navigate, from])

  const handleSignIn = async () => {
    try {
      console.debug('Auth: ensuring MSAL is initialized before loginRedirect')
      await instance.initialize()
      console.debug('Auth: calling instance.loginRedirect', { req: loginRequest })
      await instance.loginRedirect(loginRequest)
    } catch (e) {
      console.error('Login redirect failed', e)
    }
  }

  return (
    <FluentProvider theme={accessibleTheme}>
      <div className={styles.container}>
        <Card className={styles.card}>
          <div className={styles.header}>
            <Title3 className={styles.title}>
              Sign in to Unified Board Solutions
            </Title3>
            <Text as="p" className={styles.description}>
              Use your organization account to access board meeting requests and SEC workflows.
            </Text>
          </div>
          
          <div className={styles.buttonContainer}>
            <Button
              appearance="primary"
              size="large"
              icon={<PersonRegular />}
              onClick={handleSignIn}
              className={styles.button}
            >
              Sign in with Microsoft
            </Button>
          </div>
        </Card>
      </div>
    </FluentProvider>
  )
}
