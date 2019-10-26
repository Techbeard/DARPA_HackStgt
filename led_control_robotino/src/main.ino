#include <Arduino.h>
#include <FastLED.h>

#define NUM_LEDS 15
#define DATA_PIN 4

#define ENDSTOP_A 2
#define ENDSTOP_B 3

#define MOTOR_A 5
#define MOTOR_B 6

CRGB leds[NUM_LEDS];

volatile bool stopA = false;
volatile bool stopB = false;
bool direction = false;

// String data[2];
// String buf = "";
char buf[50] = {0};
byte bufIdx = 0;
bool newDataAvailable = false;

void setup()
{
  Serial.begin(115200);
  Serial.println("LED_Control");
  delay(1000);
  FastLED.addLeds<WS2811, DATA_PIN, BRG>(leds, NUM_LEDS);
  pinMode(ENDSTOP_A, INPUT);
  pinMode(ENDSTOP_B, INPUT);
  attachInterrupt(digitalPinToInterrupt(ENDSTOP_A), stopMotorA, FALLING);
  attachInterrupt(digitalPinToInterrupt(ENDSTOP_B), stopMotorB, FALLING);
  pinMode(MOTOR_A, OUTPUT);
  pinMode(MOTOR_B, OUTPUT);
}

void ledMap(uint32_t color, int ledcount)
{
  FastLED.clear();
  //ledcount = map(ledcount, 0, 100, 0, 15);
  for (int i = 0; i <= ledcount; i++)
  {
    leds[i] = color;
  }
}

void stopMotorA(){
  stopA = true;
  digitalWrite(MOTOR_A, LOW);
}
void stopMotorB(){
  stopB = true;
  digitalWrite(MOTOR_B, LOW);
}

void powerMotor(bool direction, uint8_t speed){
  if(!direction && !stopA){
    analogWrite(speed, MOTOR_A);
    digitalWrite(MOTOR_B, LOW);
  } else if (direction && !stopB){
    analogWrite(speed, MOTOR_A);
    digitalWrite(MOTOR_B, LOW);
  }
}

void processData(){
  if (newDataAvailable)
  {
    newDataAvailable = false;

    Serial.println(buf);
    uint32_t color;
    int led;
    uint8_t speed;
    int motor;
    sscanf(buf, "%06lX,%d,%d,%d", &color, &led, &speed, &motor);

    ledMap(color, led);
    FastLED.show();

    if(speed > 0){
      powerMotor(motor, speed);
    }

    Serial.print("color: ");
    Serial.println(color);
    Serial.print("led: ");
    Serial.println(led);
    Serial.print("speed: ");
    Serial.println(speed);
    Serial.print("direction: ");
    Serial.println(motor);

    bufIdx = 0;
    memset(buf, 0, sizeof(buf));
  }
}

void loop()
{
  while (Serial.available() != 0x00){
    char c = Serial.read();
    if (c == '\n'){
      newDataAvailable = true;
    } else {
      buf[bufIdx] = c;
      bufIdx++;
    }
    processData();
  }
  FastLED.clear();
  
}