import React from 'react'
import { Redirect } from '@reach/router'

export default ({ pageContext }) => {
  return <Redirect to={pageContext.to} />
}
