import React from 'react'
import PropTypes from 'prop-types'
import Helmet from 'react-helmet'
import { ThemeProvider } from 'styled-components'

const theme = {
  monospace: `'Source Code Pro', monospace`,
  tablet: `only screen and (max-width: 800px)`,
  mobile: `only screen and (max-width: 650px)`,
  colors: {
    primary: '#43bfb3',
    text: '#333',
  },
}

const DefaultLayout = ({ children }) => (
  <div>
    <Helmet title="Fione" />
    <ThemeProvider theme={theme}>{children}</ThemeProvider>
  </div>
)

DefaultLayout.propTypes = {
  children: PropTypes.func,
}

export default DefaultLayout
