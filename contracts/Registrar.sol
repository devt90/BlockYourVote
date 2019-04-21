pragma solidity ^0.5.0;

contract Registrar {

    struct Voter {
        bytes32[] allowedDomains;
        mapping (bytes32 => address) voterAddr;
        mapping (bytes32 => address) ballotAddr;
        mapping (bytes32 => uint32) ballotId;
        mapping (bytes32 => bytes32) voterPass;
    }

    struct Ballot {
        mapping (uint32 => address) ballotAddr;
        mapping(address => uint32) ballotId;
        mapping(uint32 => address) creatorAddr;
        mapping(address => uint32) ballotIdfromCreatorAddr;
        mapping(uint32 => bytes32) ballotPass;
    }

    Voter v;
    Ballot b;
    address owner;

    constructor(uint domainsList) public {
        v.allowedDomains.push('gmail.com');
        v.allowedDomains.push('yahoo.com');
        owner = msg.sender;
    }

    modifier onlyOwner {
        require(msg.sender == owner);
        _;
    }

    //also check if the email is already registered or not
    //also add ballotaddr if required
    function registerVoter(bytes32 _email, uint32 _ballotId, bytes32 _domain,bytes32 _voterPass) public {
        if (domainCheck(_domain) == false) revert();
        v.voterAddr[_email] = msg.sender;
        v.ballotId[_email] = _ballotId;
        v.voterPass[_email] = _voterPass;
        v.ballotAddr[_email] = b.ballotAddr[_ballotId];
    }

    function domainCheck(bytes32 domain) public view returns (bool) {
        for(uint i = 0; i < v.allowedDomains.length; i++) {
            if (v.allowedDomains[i] == domain) {
                return true;
            }
        }
        return false;
    }

    //also add if ballot id is different then also same email is valid
    function checkReg(bytes32 email,uint32 ballotId) public view returns (bool) {
        if ((v.voterAddr[email] == address(0x0))&& b.ballotAddr[ballotId] != address(0x0)) return true;
        else return false;
    }

    // case 1 when email id is not registered case 2 when email , sender's address, ballotid, password doesnt match
    function checkVoter(bytes32 email,uint32 ballotId,bytes32 voterPass) public view returns (uint8) {
        if (v.voterAddr[email] == address(0x0)) return 1;
        if (v.voterAddr[email] != msg.sender || v.voterPass[email] != voterPass || v.ballotId[email] != ballotId) return 2;
        else return 0;
    }

    //this is setAddress function of original file
    // also check before registering new ballot
    function registerBallot(address _ballotAddr, uint32 _ballotId, bytes32 _ballotPass) public {
        b.ballotAddr[_ballotId] = _ballotAddr;
        b.ballotId[_ballotAddr] = _ballotId;
        b.creatorAddr[_ballotId] = msg.sender;
        b.ballotIdfromCreatorAddr[msg.sender] = _ballotId;
        b.ballotPass[_ballotId] = _ballotPass; 
    }

    function getAddress(uint32 _ballotID) public view returns (address) {
        return b.ballotAddr[_ballotID];
    }


}
