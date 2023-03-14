#!/bin/bash
set -e

localVer=$1
remoteVer=$2

smallVer=$(printf "$localVer\n$remoteVer" | sort -V | head -n1)

if [[ $localVer = $remoteVer ]] || [[ $localVer = $smallVer ]]; then
    echo "no"
else
    echo "yes"
fi
