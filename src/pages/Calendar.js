import React, { Component } from "react";
import axios from "axios";
import "../styles/Calendar.css"
import TimeSlots from '../components/TimeSlots';
import Days from '../components/Days';
import MatchDialog from '../components/MatchDialog';
import MatchResult from '../components/MatchResult';
import moment from 'moment';

class Calendar extends Component {
  state = {
    // Loading stage
    loading: true,
    timeSlots: [],
    allDays: [],
    bellringer: '',
    dayOff: 0,
    // Displaying stage
    displaying: false,
    chosenSlots: [],
    // Matching stage
    matching: false,
    matchedListener: '',
    matchedTimeSlot: '',
    // success stage, a listener is matched!
    success: false,
    // failure stage, no listener is matched...
    failure: false,
    // confirming stage
    confirming: false,
    // confirmed stage
    confirmed: false,
    // cancelled stage
    cancelled: false
  }

  async componentDidMount() {
    // Decide the 7 days starting today
    const refDays = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
    const today = moment().format('dddd')
    const off = refDays.indexOf(today)
    var days = Array(7)
    for (var i=0; i<7; i++) {
      const j = (i+off)%7
      days[i] = refDays[j]
    }
    this.setState({
      allDays : days,
      dayOff : off
    })

    // get all the time slots from backend
    console.log("Getting time slots from backend!")
    const url = 'https://ringbell-api.herokuapp.com/api/v1/listeners/timeslots'
    const resp = await axios.get(url)
    this.setState({
      loading: false,
      displaying: true,
      timeSlots : resp.data.data,
      bellringer : JSON.parse(window.sessionStorage.getItem("bellringer_info"))
    })
    console.log(this.state.timeSlots)
    // console.log(this.state.bellringer)
    console.log(this.state.bellringer)
  }

  async componentDidUpdate() {
    if (this.state.displaying) {
      console.log("Making choices...")
      return
    }
    if (this.state.matching) {
      // Choices confirmed! Sending all chosen time slot IDs to backend after compensating for day offset
      console.log("Choices confirmed! Matching Listeners...")
      const chosenSlots = this.state.chosenSlots.map(slotId => {
        const day = (Math.floor(slotId/24))%7
        const time = slotId%24
        return day*24+time
      })
      console.log({
        title: "User chosen time slot IDs",
        body: chosenSlots
      })
      
      // manually added a delay here to see if matching state is handled properly, will delete later
      // await new Promise(r => setTimeout(r, 3000)); 

      const url = 'https://ringbell-api.herokuapp.com/api/v1/listeners/getMatch'
      axios.post(url, {
        title: "User chosen time slot IDs",
        body: chosenSlots // a list of time slot IDs (e.g [10,34,61,...])
      }).then (response => this.setState({
          matching : false,
          success : true,
          matchedListener : response.data.data.listener,
          matchedTimeSlot : response.data.data.timeSlot
      }))

      
      return
    }
    if (this.state.success) {
      console.log("Found a matched listener!")
      console.log(this.state.matchedListener)
      console.log(this.state.matchedTimeSlot)
      return
    }
    if (this.state.confirming) {
      console.log("Confirming the appointment time...")
      return
    }
    if (this.state.confirmed) {
      console.log("Sending confirmation back to backend...")
      const url = 'https://ringbell-api.herokuapp.com/api/v1/listeners/confirmMatch'
      console.log(
        { "timeSlot" : this.state.matchedTimeSlot, 
          "listener" : this.state.matchedListener, 
          "bellRinger" : this.state.bellringer
        })
      axios.post(url, {
        title: "User confirmed time slot ID and Listener",
        body: {"timeSlot" : this.state.matchedTimeSlot, 
               "listener" : this.state.matchedListener, 
               "bellRinger" : this.state.bellringer
              }
      }).then (response => console.log(response.data))
    }
  }

  handleTimeSlotClick = (e) => {
    // update the slot color
    e.target.style.backgroundColor = e.target.style.backgroundColor==='' ? '#1187c2' : '' 
    // update the chosenSlots
    var updChosenSlots = this.state.chosenSlots.filter(id => {return id!==parseInt(e.target.id)})
    if (updChosenSlots.length===this.state.chosenSlots.length) {
      updChosenSlots.push(parseInt(e.target.id))
    }
    this.setState({
      chosenSlots : updChosenSlots
    })
  }
  handleNextClick = (e) => {
    this.setState({
      displaying : false,
      matching: true
    })
  }
  handleSuccessDialogOkClick = (e) => {
    this.setState({
      success : false,
      confirming : true,
    })
  }
  handleConfirmBookingClick = (e) => {
    this.setState({
      confirming: false,
      confirmed: true 
    })
  }
  handleRescheduleClick = (e) => {
    this.setState({
      confirming: false,
      displaying: true,
      chosenSlots: []
    })
  }
  handleCancelBookingClick = (e) => {
    this.setState({
      confirming: false,
      cancelled: true
    })
  }
  render() {
    return (
      <div>
          { 
            this.state.loading ? 
            <div>Loading...</div> :
            this.state.displaying ?
            <div>
              <h1>Please choose your available time slots</h1>
              <Days allDays={this.state.allDays}/>
              <TimeSlots timeSlots={this.state.timeSlots} allDays={this.state.allDays} dayOff={this.state.dayOff} handleTimeSlotClick={this.handleTimeSlotClick}/>
            </div> : 
            this.state.confirming ? 
            <div>
              <MatchResult matchedListener={this.state.matchedListener} matchedTimeSlot={this.state.matchedTimeSlot} handleConfirmBookingClick={this.handleConfirmBookingClick} handleRescheduleClick={this.handleRescheduleClick} handleCancelBookingClick={this.handleCancelBookingClick}/>
            </div> :
            this.state.confirmed ? 
            <div>Thank you for booking with us! You will get an email confirmation in a second!</div> :
            this.state.cancelled ? 
            <div>Appointment cancelled! See you next time!</div> :
            <div></div>
          }

          {
            this.state.displaying||this.state.matching||this.state.success ? 
            <div>
              <MatchDialog numChosenSlots={this.state.chosenSlots.length} message={this.state.success?'Matching is done! We have found you a listener!':'Matching in progress...'} handleNextClick={this.handleNextClick}handleSuccessDialogOkClick={this.handleSuccessDialogOkClick}/> 
            </div> : 
            <div></div>
          }
      </div>
    );
  }
}

export default Calendar;
