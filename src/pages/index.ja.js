import React, { Component } from 'react'
import styled from 'styled-components'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Button from '../components/Button'

const Hero = styled.div`
  z-index: 1;
  background-image: linear-gradient(
    120deg,
    #43bfb3 0%,
    #7de2d1 100%
  );
  color: #fff;
  padding: 70px;
  border-radius: 0 0 50% 50% / 4%;
  display: flex;
  justify-content: space-between;

  section:first-child {
    width: 50%;
    margin-left: 3%;
  }

  section:last-child {
    width: 45%;
  }

  h2 {
    margin-top: 1.5rem;
    font-size: 3.5em;
    margin-bottom: 0.25em;
    font-weight: bold;
    letter-spacing: 1.5px;
    line-height: 1.05em;
    display: inline-block;
  }

  h3 {
    font-size: 1.5em;
    margin-top: 0;
    margin-bottom: 1.5em;
    font-weight: 300;
  }

  @media only screen and (max-width: 800px) {
    padding: 50px 15px;
    flex-direction: column;

    h2 {
      font-size: 2.5em;
    }

    h3 {
      font-size: 1.25em;
    }

    section:first-child, section:last-child {
      width: 100%;
    }

    section:first-child {
      margin: 0 0 2em 0;
    }
  }
`

const Philosophy = styled.section`
  background: #f9f8f9;
  display: flex;
  justify-content: space-around;
  margin-top: -2em;
  padding: 5em 2em 2em 2em;

  div {
    width: 30%;
  }

  h3 {
    color: #43bfb3;
  }

  p {
    margin-top: 0;
  }

  @media only screen and (max-width: 800px) {
    flex-direction: column;

    div {
      width: 90%;
      margin: auto;
    }
  }
`

class IndexPage extends Component {
  render() {
    return (
      <div>
        <Header currentPath={this.props.location.pathname} fixed="true" lang="ja"/>
        <Hero>
          <section>
            <h2>エンタープライズ AI プラットフォーム</h2>
            <h3>
            Fione (フィオネ) は「5 分くらいで簡単に機械学習をできるサーバー」です。
            Dockerの実行環境があればどのOSでも実行可能です。 
            Fione はApacheライセンスで提供され、無料 (フリーソフト) でご利用いただけます。
            </h3>
            <Button to="/docs/ja/getting-started/quickstart" large="true">
              Get Started
            </Button>
            <Button to="/docs/ja/getting-started/overview" large="true" transparent="true">
              Docs
            </Button>
          </section>
          <section>
            <img src="/media/ja/welcome.png" alt="Fione" />
          </section>
        </Hero>
        <Philosophy>
          <div>
            <h3>簡単</h3>
            <p>
              Dockerの実行環境があれば、コマンド1つでFioneを起動できます。
            </p>
          </div>
          <div>
            <h3>オープン</h3>
            <p>
              FioneはGitHub上で開発されるオープンソースのソフトウェアです。
              OSSの開発に自由に参加して、利用することができます。
            </p>
          </div>
          <div>
            <h3>AutoML</h3>
            <p>
              機械学習の専門知識がなくても利用することができます。
              手持ちのデータをアップロードするだけで、機械学習の予測結果を取得できます。
            </p>
          </div>
        </Philosophy>
        <Footer />
      </div>
    )
  }
}

export default IndexPage
