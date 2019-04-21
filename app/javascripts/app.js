import '../stylesheets/app.css'

import {
    default as Web3
} from 'web3'
import {
    default as contract
} from 'truffle-contract'
import {
    sha3withsize
} from 'solidity-sha3'
import { 
    default as HookedWeb3Provider
} from 'hooked-web3-provider'
import {
    default as lightwallet
} from 'eth-lightwallet'

import { sha3_256 } from 'js-sha3';

import registrar_artifacts from '../../build/contracts/Registrar.json'
import voting_artifacts from '../../build/contracts/Voting.json'
import creator_artifacts from '../../build/contracts/Creator.json'


var Registrar = contract(registrar_artifacts)
var Voting = contract(voting_artifacts)
var Creator = contract(creator_artifacts)
var input1 = 1
var input2 = 0
var timestamp

var ballotID

let candidates = {}

//Set Web3 on page load

$(document).ready(function() {

    /*var provider = new HookedWeb3Provider({
        host: "http://localhost:8545",
        transaction_signer: ks
    });*/

    //window.web3 = provider;
    //window.web3.setProvider(provider);
    //window.web3 = new Web3(provider);

    if (typeof web3 !== "undefined") {
        window.web3 = new Web3(web3.currentProvider)
    } else {
        window.web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"))
    }

    Registrar.setProvider(web3.currentProvider)
    Voting.setProvider(web3.currentProvider)
    Creator.setProvider(web3.currentProvider)

    //Register.setProvider(provider);
    //Voting.setProvider(provider);

})

//End page load setup

//Load ballot using user input ballot ID

window.loadBallot = function() {
    $("#candidate-rows tr").remove()
    ballotID = $("#ballotid").val()
    candidates = {}

    console.log("Loading ballot id: " + ballotID)

    Registrar.deployed().then(function(contract) {
        contract.getAddress.call(ballotID).then(function(v) {
            var votingAddress = v.toString();
            if (votingAddress == 0) {
                window.alert("Invalid ballot ID!")
                //$("#msg4").html("Invalid ballot ID!")
                throw new Error()
            } else {
                $("#msg4").html("Setting up ballot...")
                //$("#ballotid").val("")
                getCandidates(votingAddress, ballotID)
            }
        })
    })
}

//End load ballot

//Register voter using ballot id and e-mail address

window.registerToVote = function() {

    console.log("registring to vote")
    //var t0 = performance.now()
    let ballotNumber = $("#ballotNumber").val()
    let email = $("#email").val()
    let voterPassword = $("#voterPassword").val()

    var domain = email.replace(/.*@/, "")

    console.log("id number: ", idNumber)
    console.log("email: ", email)
    console.log("permreq: ", permreq)

    Registrar.deployed().then(function(contract) {
        contract.domainCheck.call(domain).then(function(v) {

            console.log("v:",v);
            console.log("v.tostr:", v.toString())

            var domainValid = v.toString()

            if (domainValid == "false") {
                window.alert("Invalid e-mail address!")
                //$("#msg2").html("Invalid e-mail address!")
                throw new Error()
            }

            console.log("domain id is valid")

            contract.checkReg.call(email,ballotNumber).then(function(v) {
                var emailValid = v.toString()

                if (emailValid == "false") {
                    window.alert("E-mail/ID Number already registered to vote!")
                    //$("#msg2").html("E-mail already registered to vote!")
                    throw new Error()
                }

                $("#ballotNumber").val("")
                $("#email").val("")
                $("voterPassword").val("")

                contract.registerVoter(email, ballotNumber, domain, voterPassword, {
                    gas: 25000000,
                    from: web3.eth.accounts[0]
                }).then(function() {
                    //$("#msg2").html("Account ready to vote!")
                    window.alert("Account ready to vote!")
                    /*var t1 = performance.now()
                    window.alert('It took' + (t1 - t0) + 'ms to finish')*/
                })
            })
        })
        $("#msg2").html("Registration attempt successful! Please wait for verification.")
    })
}

//End voter registration

//Vote for user input choice

window.voteForCandidate = function(candidate) {

    console.log("vote for candidate")
    let candidateName = $("#candidate").val()
    let email = $("#e-mail").val()
    let votingPassword = $("#votingPassword").val();
    $("#msg2").html("")
    $("#msg4").html("")

    console.log("candidate selected for voting: ", candidateName)
    console.log("email id of voter: ", email)
    var domain = email.replace(/.*@/, "")
    var cHash = sha3withsize(candidateName, 32)

    console.log("cHash of candidate selected: ", cHash)
    var votesArray = []

    Registrar.deployed().then(function(contract) {
        contract.checkVoter(email, {
            gas: 25000000,
            // TODO: check this account
            from: web3.eth.accounts[0]
        }).then(function(v) {
            var voterCheck = v.toString()

            if (voterCheck == 1) {
                window.alert("E-mail address not registered!")
                //$("#msg").html("E-mail address not registered!")
                throw new Error()
            } else if (voterCheck == 2) {
                window.alert("E-mail address and Ethereum address mismatch!")
                //$("#msg").html("E-mail address and Ethereum address mismatch!")
                throw new Error()
            }

            contract.getAddress.call(ballotID).then(function(v) {
                var ballotAddress = v.toString();
                console.log("contract.get address\nvoting address: ", ballotAddress)
                Voting.at(ballotAddress).then(function(contract) {
                    contract.validCandidate.call(cHash).then(function(v) {
                        var candValid = v.toString()

                        if (candValid == "false") {
                            window.alert("Invalid Candidate!")
                            //$("#msg").html("Invalid Candidate!")
                            throw new Error()
                        }
                        contract.checkVoteattempts.call().then(function(v) {
                            var attempCheck = v.toString()

                            if (attempCheck == "false") {
                                window.alert("You have reached your voting limit for this ballot/poll!")
                                //$("#msg").html("You have reached your voting limit for this ballot/poll!")
                                throw new Error()
                            }
                            $("#msg").html("Your vote attempt has been submitted. Please wait for verification.")
                            $("#candidate").val("")
                            $("#e-mail").val("")
                            $("#votingPassword").val("")

                            contract.candidateList.call(ballotID).then(function(candidateArray) {
                                for (let i = 0; i < candidateArray.length; i++) {
                                    let hcand = (web3.toUtf8(candidateArray[i]))
                                    let hcHash = sha3withsize(hcand, 32)

                                    if (hcHash == cHash) {
                                        encrypt(hcHash, input1, i, candidateArray, email, ballotAddress, votesArray)
                                    } else {
                                        encrypt(hcHash, input2, i, candidateArray, email, ballotAddress, votesArray)
                                    }
                                }
                            })
                        })
                    })

                })
            })
        })
    })

}

//not studied carefully, error might occur
function encrypt(hcHash, vnum, i, candidateArray, email, ballotAddress, votesArray) {
    var einput1
    $.ajax({
        type: "GET",
        url: "http://localhost:3000/encrypt/" + vnum,
        success: function(eoutput1) {
            Voting.at(ballotAddress).then(function(contract) {
                contract.votesFor.call(hcHash).then(function(v) {
                    einput1 = v.toString()
                    einput1 = scientificToDecimal(einput1)

                    if (einput1 != 0) {
                        add(eoutput1, einput1, i, candidateArray, email, ballotAddress, votesArray)
                    }
                })
            })
        }
    })
}

function add(eoutput1, einput1, i, candidateArray, email, ballotAddress, votesArray) {
    $.ajax({
        type: "GET",
        url: "http://localhost:3000/add/" + eoutput1 + "/" + einput1,
        success: function(eadd1) {
            //verifyTimestamp(eadd1, i, candidateArray, email, ballotAddress, votesArray)
            votesArray[i] = eadd1
            if (i == candidateArray.length - 1) {
                vote(i, candidateArray, email, ballotAddress, votesArray)
            }
        }
    })
}

//delete this function
function verifyTimestamp(eadd1, i, candidateArray, email, votingAddress, votesArray) {
    Voting.at(votingAddress).then(function(contract) {
        contract.checkTimelimit.call().then(function(v) {
            var timecheck = v.toString()
            if (timecheck == "false") {
                contract.getTimelimit.call().then(function(v) {
                    var endtime = v.toString()
                    //Testnet is plus 7 hours, uncomment this line if testing on testnet
                    //endtime = endtime - 21600
                    endtime = new Date(endtime * 1000)
                    getVotes(votingAddress)
                    //window.alert("Voting period for this ballot has ended on " +endtime)
                    $("#msg").html("Voting period for this ballot has ended on " + endtime)
                    throw new Error()
                })
            } else {
                votesArray[i] = eadd1
                if (i == candidateArray.length - 1) {
                    vote(i, candidateArray, email, votingAddress, votesArray)
                }
            }
        })
    })
}

function vote(i, candidateArray, email, ballotAddress, votesArray) {
    Voting.at(ballotAddress).then(function(contract) {
        contract.voteForCandidate(votesArray, email, candidateArray, {
            gas: 25000000,
            from: web3.eth.accounts[0]
        }).then(function() {
            getVotes(ballotAddress)
            $("#msg").html("")
            window.alert("Your vote has been verified!")
        })
    })
}

//End voting process

//Start ballot creation process using user input data

window.ballotSetup = function() {

    let ballotid = Math.floor(Math.random() * 4294967295)
    let title = $("vtitle").val();
    let ballotPassword = $("ballotPassword").val();
    let choices = $("#choices").val()
    console.log("choices: ", choices)
    var choicesArray = choices.split(/\s*,\s*/)

    Creator.deployed().then(function(contract) {
        contract.createBallot(ballotid, title, ballotPassword, {
            gas: 25000000,
            from: web3.eth.accounts[0]
        }).then(function() {
            contract.getAddress.call(ballotid,ballotPassword).then(function(v) {
                var ballotAddress = v.toString()
                console.log(ballotAddress)
                //window.alert(votingAddress)
                fillCandidates(ballotAddress, choicesArray,ballotid)
                registerBallot(ballotAddress, ballotid,ballotPassword)
            })
        })
    })
                    
}

function registerBallot(ballotAddress, ballotid,ballotPassword) {
    Registrar.deployed().then(function(contract) {
        contract.registerBallot(ballotAddress, ballotid,ballotPassword, {
            gas: 25000000,
            from: web3.eth.accounts[0]
        }).then(function() {
            window.alert("Ballot creation successful! Ballot ID: " + ballotid + "\nPlease write the down the Ballot ID because it will be used to load your ballot allowing users to vote")
        })
    })
}

//delete this function
function fillSetup(votingAddress, choicesArray, ballotid) {
    fillCandidates(votingAddress, choicesArray)
}

function fillCandidates(ballotAddress, choicesArray) {
    Voting.at(ballotAddress).then(function(contract) {
        contract.setCandidates(choicesArray, {
            gas: 25000000,
            from: web3.eth.accounts[0]
        }).then(function() {
            contract.hashCandidates({
                gas: 25000000,
                from: web3.eth.accounts[0]
            }).then(function() {
                //
            })
        })
    })
}

//delete this function
function fillWhitelisted(votingAddress, whitelistedArray) {
    Voting.at(votingAddress).then(function(contract) {
        contract.setWhitelisted(whitelistedArray, {
            gas: 25000000,
            from: web3.eth.accounts[0]
        }).then(function() {
            //
        })
    })
}

//End ballot creation process

function getCandidates(votingAddress, ballotID) {
    Voting.at(votingAddress).then(function(contract) {
        contract.getTitle.call().then(function(title) {
            $("#btitle").html(title)

            contract.candidateList.call(ballotID).then(function(candidateArray) {
                for (let i = 0; i < candidateArray.length; i++) {
                    candidates[web3.toUtf8(candidateArray[i])] = "candidate-" + i
                }

                setupTable()
                //getVotes(votingAddress)
            })
        })
    })
}

function setupTable() {
    Object.keys(candidates).forEach(function(candidate) {
        $("#candidate-rows").append("<tr><td>" + candidate + "</td><td id='" + candidates[candidate] + "'></td></tr>");
    })
}

//getcandidates ki call se htaya hai ye
function getVotes(votingAddress) {
    let candidateNames = Object.keys(candidates)
    for (var i = 0; i < candidateNames.length; i++) {
        console.log(candidateNames[i])
        let name = candidateNames[i]
        let cvHash = sha3withsize(name, 32)
        console.log(cvHash)

        Voting.at(votingAddress).then(function(contract) {
            contract.totalVotesFor.call(cvHash).then(function(v) {
                console.log("hello")
                var convVote = v.toString()
                console.log(convVote)
                if (convVote == 0) {
                    contract.getTimelimit.call().then(function(v) {
                        var endtime = v.toString()
                        //Testnet is plus 7 hours, uncomment this line if testing on testnet
                        //endtime = endtime - 21600
                        endtime = new Date(endtime * 1000);
                        $("#msg").html("Results will be displayed once the voting period has ended (" + endtime + ")")
                        //window.alert("Results will be displayed once the voting period has ended (" + endtime + ")")
                    })
                } else {
                    convVote = scientificToDecimal(convVote)
                    console.log(convVote)
                    decrypt(convVote, name)
                }
            })
        })
    }
}

function decrypt(convVote, name) {
    $.ajax({
        type: "GET",
        url: "http://localhost:3000/decrypt/" + convVote,
        success: function(eoutput) {
            var voteNum = eoutput
            $("#" + candidates[name]).html(voteNum.toString())
        }
    })
}
