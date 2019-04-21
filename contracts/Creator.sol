pragma solidity ^0.5.0;

contract Voting {

    //ballotCreator and owner are same
    //delete whitelist if not used
    struct Ballot {
        uint32 ballotId;
        string title;
        address ballotCreator;
        address owner;
    }

    struct Candidates {
        bytes32[] candidateList;
        mapping (bytes32 => bytes32) candidateHash;
        mapping (bytes32 => uint256) votesReceived;
    }

    //delete whitelisted if not used
    struct Voter {
        mapping (address => uint8) attemptedVotes;
    }

    Candidates c;
    Voter v;
    Ballot b;

    string convertCandidate;
    string tempTitle;
    bytes32 tempCandidate;
    uint256 tempVote;
    bytes32 tempHash;
    uint256[] tempVotes;
    bytes32[] tempCandidates;
    bytes32 tempEmail;
    address owner;

    constructor(uint32 _ballotId, string memory _title, address _creator) public {
        b.ballotId = _ballotId;
        b.title = _title;
        b.ballotCreator = _creator;
        b.owner = _creator;
        owner = _creator;
    }

    modifier onlyOwner {
        require(msg.sender == owner);
        _;
    }

    function setCandidates(bytes32[] memory _candidates) public onlyOwner {
        for(uint i = 0; i < _candidates.length; i++) {
            tempCandidate = _candidates[i];
            c.candidateList.push(tempCandidate);
        }
    }

    function hashCandidates() public onlyOwner {
        tempVote = 1;
        for(uint i = 0; i < c.candidateList.length; i++) {
            tempCandidate = c.candidateList[i];
            convertCandidate = bytes32ToString(tempCandidate);
            c.candidateHash[tempCandidate] = keccak256(abi.encodePacked(convertCandidate));
            c.votesReceived[keccak256(abi.encodePacked(convertCandidate))] = tempVote;
        }
    }

    //figure out this function more
    //create more checks in this function
    //try to write this function on your own after understanding app.js
    function voteForCandidate(uint256[] memory _votes, bytes32 _email, bytes32[] memory _candidates) public {
        //if (checkTimelimit() == false || checkVoteattempts() == false) revert();
        //if (checkWhitelist() == true && checkifWhitelisted(_email) == false) revert();
        tempVotes = _votes;
        tempCandidates = _candidates;
        v.attemptedVotes[msg.sender] += 1;

        for(uint i = 0; i < tempCandidates.length; i++) {
            tempCandidate = tempCandidates[i];
            tempHash = c.candidateHash[tempCandidate];
            if (validCandidate(tempHash) == false) revert();
            tempVote = tempVotes[i];
            c.votesReceived[tempHash] = tempVote;
        }
    }

    // start here
    //these functions are changed very less
    function votesFor(bytes32 cHash) public returns (uint256){
        if (validCandidate(cHash) == false) revert();
        return c.votesReceived[cHash];
    }

    function totalVotesFor(bytes32 cHash) public  returns (uint256){
        //if (checkBallottype() == false && checkTimelimit() == true) return 0;
        if (validCandidate(cHash) == false) revert();
        return c.votesReceived[cHash];
    }

    function bytes32ToString(bytes32 x) private pure returns (string memory) {
        bytes memory bytesString = new bytes(32);
        uint charCount = 0;
        for (uint j = 0; j < 32; j++) {
            byte char = byte(bytes32(uint(x) * 2 ** (8 * j)));
            if (char != 0) {
                bytesString[charCount] = char;
                charCount++;
            }
        }
        bytes memory bytesStringTrimmed = new bytes(charCount);
        for (uint j = 0; j < charCount; j++) {
            bytesStringTrimmed[j] = bytesString[j];
        }
        return string(bytesStringTrimmed);
    }

    function validCandidate(bytes32 cHash) public returns (bool) {
        for(uint k = 0; k < c.candidateList.length; k++) {
            tempCandidate = c.candidateList[k];
            if (c.candidateHash[tempCandidate] == cHash) {
                return true;
            }
        }
        return false;
    }

    function candidateList(uint64 _ballotID) public view returns (bytes32[] memory) {
        if (checkballotID(_ballotID) == false) revert();
        return c.candidateList;
    }

    function checkballotID(uint64 ballotID) private view returns (bool) {
        if (ballotID == b.ballotId) return true;
        else return false;
    }
    //end here

     function checkVoteattempts() public view returns (bool) {
        if (v.attemptedVotes[msg.sender] >= 1) return false;
        else return true;
    }


    function getTitle() public view returns (string memory) {
        return b.title;
    }
}

//                         //
//Start of Creator contract//
//                         //

contract Creator {

    mapping (uint32 => address) ballots;
    mapping(uint32 => bytes32) ballotPass;
    address owner;

    function createBallot(uint32 _ballotId, string memory _title,bytes32 _pass) public {
        owner = msg.sender;
        Voting newContract = new Voting(_ballotId, _title,owner);
        ballots[_ballotId] = address(newContract);
        ballotPass[_ballotId] = _pass;
    }

    function getAddress(uint32 ballotId,bytes32 pass) public view returns(address contractAddress) {
        if(ballotPass[ballotId]!=pass)revert();
        return ballots[ballotId];
    }
}
