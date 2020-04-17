import { Link } from "gatsby"
import styled from 'styled-components'

const Button = styled(Link)`
  text-decoration: none;
  background: ${props => (props.transparent ? 'transparent' : 'white')};
  color: ${props => props.transparent ? 'inherit' : '#43bfb3'};
  border: 2px solid white;
  padding: 0.44em 1.2em;
  border-radius: 50px;
  display: inline-block;
  margin: 0 0.25em;
  transition: all 0.25s;
  cursor: pointer;
  box-shadow: 0 2px 30px 0px rgba(30, 112, 167, 0.39);
  font-size: 1.15rem;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 2px 30px 0px rgba(30, 112, 167, 0.6);
    color: ${props => props.transparent ? 'inherit' : '#43bfb3'};
  }
`

export default Button
