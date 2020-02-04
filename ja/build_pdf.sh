#!/bin/bash
SCRIPT_DIR=$(cd $(dirname $0);pwd)

DOCLANG="ja"
AUTHOR="CodeLibs"
RELEASE="12.1"

CONFDIR="${SCRIPT_DIR}/../conf"
BUILDDIR="${SCRIPT_DIR}/_build/pdf/${RELEASE}"

PROJECT="FioneInstall"
TITLE="Fione インストールガイド"
TYPE="install"
echo "Processing ${SCRIPT_DIR}/${RELEASE}/${TYPE}"
cd ${SCRIPT_DIR}/${RELEASE}/${TYPE}
make SPHINXOPTS="-c ${CONFDIR}" BUILDDIR="${BUILDDIR}/${TYPE}" SPHINX_LANG="${DOCLANG}" SPHINX_PROJECT="${PROJECT}" SPHINX_TITLE="${TITLE}" SPHINX_AUTHOR="${AUTHOR}" SPHINX_RELEASE="${RELEASE}" -f ${CONFDIR}/Makefile latexpdfja

PROJECT="FioneUser"
TITLE="Fione ユーザーガイド"
TYPE="user"
echo "Processing ${SCRIPT_DIR}/${RELEASE}/${TYPE}"
cd ${SCRIPT_DIR}/${RELEASE}/${TYPE}
make SPHINXOPTS="-c ${CONFDIR}" BUILDDIR="${BUILDDIR}/${TYPE}" SPHINX_LANG="${DOCLANG}" SPHINX_PROJECT="${PROJECT}" SPHINX_TITLE="${TITLE}" SPHINX_AUTHOR="${AUTHOR}" SPHINX_RELEASE="${RELEASE}" -f ${CONFDIR}/Makefile latexpdfja

PROJECT="FioneAdmin"
TITLE="Fione 管理者ガイド"
TYPE="admin"
echo "Processing ${SCRIPT_DIR}/${RELEASE}/${TYPE}"
cd ${SCRIPT_DIR}/${RELEASE}/${TYPE}
make SPHINXOPTS="-c ${CONFDIR}" BUILDDIR="${BUILDDIR}/${TYPE}" SPHINX_LANG="${DOCLANG}" SPHINX_PROJECT="${PROJECT}" SPHINX_TITLE="${TITLE}" SPHINX_AUTHOR="${AUTHOR}" SPHINX_RELEASE="${RELEASE}" -f ${CONFDIR}/Makefile latexpdfja

PROJECT="FioneApi"
TITLE="Fione APIガイド"
TYPE="api"
echo "Processing ${SCRIPT_DIR}/${RELEASE}/${TYPE}"
cd ${SCRIPT_DIR}/${RELEASE}/${TYPE}
make SPHINXOPTS="-c ${CONFDIR}" BUILDDIR="${BUILDDIR}/${TYPE}" SPHINX_LANG="${DOCLANG}" SPHINX_PROJECT="${PROJECT}" SPHINX_TITLE="${TITLE}" SPHINX_AUTHOR="${AUTHOR}" SPHINX_RELEASE="${RELEASE}" -f ${CONFDIR}/Makefile latexpdfja