import vlc
import time
import requests
import webbrowser
import os
from thread import start_new_thread
import threading


timestamps = []
actions = []
delays = []
PREFIX = "http://192.168.0.1:3016"


CHANGE_LIGHT ="/rest/randomcolor"
MOVE_LEFT = "/rest/mv_func/left"
MOVE_RIGHT = "/rest/mv_func/left"
ROTATE_RIGHT = "/rest/mv_func/rotate_right"
ROTATE_LEFT = "/rest/mv_func/rotate_left"
STOP = "/rest/mv_func/stop"


GRIPPER_OPEN = "/rest/gripper_state/1"
GRIPPER_CLOSE = "/rest/gripper_state/2"


PLATTFORM_OPEN = "/rest/gripper_state/1"
PLATTFORM_CLOSE = "/rest/gripper_state/2"

timestamps.append(6500)
actions.append(CHANGE_LIGHT)
delays.append((timestamps[len(timestamps)-1] /100))

timestamps.append(7500)
actions.append(CHANGE_LIGHT)
delays.append((timestamps[len(timestamps)-1] /100)-(timestamps[len(timestamps)-2] /100))

timestamps.append(14000)
actions.append(CHANGE_LIGHT)
delays.append((timestamps[len(timestamps)-1] /100)-(timestamps[len(timestamps)-2] /100))

timestamps.append(14700)
actions.append(CHANGE_LIGHT)
delays.append((timestamps[len(timestamps)-1] /100)-(timestamps[len(timestamps)-2] /100))

timestamps.append(26000)
actions.append(CHANGE_LIGHT)
delays.append((timestamps[len(timestamps)-1] /100)-(timestamps[len(timestamps)-2] /100))

timestamps.append(32000)
actions.append(GRIPPER_OPEN)
delays.append((timestamps[len(timestamps)-1] /100)-(timestamps[len(timestamps)-2] /100))

timestamps.append(34000)
actions.append(GRIPPER_CLOSE)
delays.append((timestamps[len(timestamps)-1] /100)-(timestamps[len(timestamps)-2] /100))

timestamps.append(51000)
actions.append(CHANGE_LIGHT)
delays.append((timestamps[len(timestamps)-1] /100)-(timestamps[len(timestamps)-2] /100))

timestamps.append(52000)
actions.append(CHANGE_LIGHT)
delays.append((timestamps[len(timestamps)-1] /100)-(timestamps[len(timestamps)-2] /100))

timestamps.append(53000)
actions.append(ROTATE_RIGHT)
delays.append((timestamps[len(timestamps)-1] /100)-(timestamps[len(timestamps)-2] /100))

timestamps.append(55000)
actions.append(ROTATE_LEFT)
delays.append((timestamps[len(timestamps)-1] /100)-(timestamps[len(timestamps)-2] /100))

timestamps.append(57000)
actions.append(STOP)
delays.append((timestamps[len(timestamps)-1] /100)-(timestamps[len(timestamps)-2] /100))



print(delays)
def heron():
    counter = 0
    global p
    while True:
        
        ts = p.get_time()
        #print(ts)
        if(ts < 100):
            print("tick")
            for d in delays:
                print(d/10.0)
                print("call" + PREFIX+actions[counter])
                res = requests.get(PREFIX+actions[counter])
                time.sleep(d/10.0)
            return True
        
        #for i in range(0,len(timestamps)):
        #    if timestamps[i] == ts:
        #        print("call" + PREFIX+actions[i])
        #        res = requests.get(PREFIX+actions[i])
    

        
        
    return True

global p

#res = requests.get(PREFIX+MOVE_LEFT)
#time.sleep(10)
#res = requests.get(PREFIX+STOP)
#inst = vlc.Instance()   
#p = inst.media_player_new("./nom.mp3")
#p.play()

#t = threading.Thread(name='non-daemon', target=heron)
#t.start()



#time.sleep(110)
#res = requests.get(PREFIX+ROTATE_LEFT)
#res = requests.get(PREFIX+CHANGE_LIGHT)
#time.sleep(2)

while True:
    res = requests.get(PREFIX+ROTATE_RIGHT)
    time.sleep(1)
    res = requests.get(PREFIX+CHANGE_LIGHT)
    time.sleep(1)
    res = requests.get(PREFIX+ROTATE_LEFT)
    time.sleep(1)
    res = requests.get(PREFIX+CHANGE_LIGHT)
    time.sleep(1)


#t.join()
#print("yo")

#res = requests.get(PREFIX+MOVE_RIGHT)
#time.sleep(10)
res = requests.get(PREFIX+STOP)


