package com.bah.c4s.crowsnest.server;

import java.io.IOException;

import javax.websocket.CloseReason;
import javax.websocket.CloseReason.CloseCodes;
import javax.websocket.OnClose;
import javax.websocket.OnMessage;
import javax.websocket.OnOpen;
import javax.websocket.Session;
import javax.websocket.server.ServerEndpoint;
import org.json.simple.JSONObject;
import org.json.simple.parser.JSONParser;
import org.json.simple.parser.ParseException;

import org.apache.accumulo.core.client.AccumuloException;
import org.apache.accumulo.core.client.AccumuloSecurityException;
import org.apache.log4j.Logger;

import com.bah.c4s.crowsnest.server.export.CSVExporter;


@ServerEndpoint(value = "/interface")
public class DataInterfaceServer {
   
  private Logger LOG = Logger.getLogger(this.getClass().getName());
  private Session session;
  private static QueryRunner queryRunner = null;
  private static CommentRunner commentRunner = null;
  private static AlertRunner alertRunner = null;
  private static EsRunner esRunner = null;
  
  private JSONParser parser = new JSONParser();
  
  public DataInterfaceServer(){
    try {
      if(queryRunner == null){
          //queryRunner = new QueryRunner();
      }
      if(commentRunner == null){
          //commentRunner = new CommentRunner();
      }
      if(alertRunner == null){
          //alertRunner = new AlertRunner();
      }
      if(esRunner == null){
    	  esRunner = new EsRunner();
      }
    /*
    } catch (AccumuloException e) {
      // TODO Auto-generated catch block
      e.printStackTrace();
    } catch (AccumuloSecurityException e) {
      // TODO Auto-generated catch block
      e.printStackTrace();*/
    }finally{
    	LOG.debug("Runners established");
    }
  }
  
  
  @OnOpen
  public void onOpen(Session session) {
    this.session = session;
    LOG.info("Connected ... " + session.getId());
  }

  @OnMessage
  public void onMessage(String message) {
    processMessage(message);
  }

  @OnClose
  public void onClose(Session session, CloseReason closeReason) {
    LOG.info(String.format("Session %s closed because of %s", session.getId(), closeReason));
  }

  private JSONObject parseMessage(String rawMessage) {
    
    JSONObject jsonObj;
    try {
      Object obj = parser.parse(rawMessage);
      jsonObj = (JSONObject) obj;
    } catch (ParseException e) {
      e.printStackTrace();
      throw new IllegalArgumentException("Parse error: " + rawMessage);
    } catch (Exception e) {
      e.printStackTrace();
      throw new IllegalArgumentException("Incorrect message: " + rawMessage);
    }
    return jsonObj;
  }

  private void processMessage(String raw) {
    JSONObject json = parseMessage(raw);
    LOG.info("Recieved Command: " + json.toString());
    switch (json.get("command").toString()) {
    
    case "QUIT":
      try {
        session.close(new CloseReason(CloseCodes.NORMAL_CLOSURE, "User Closed"));
      } catch (IOException e) {
        e.printStackTrace();
        throw new RuntimeException(e);
      }
      break;
    
    case "QUERY": 
		try {
			esRunner.search(session, parseMessage(json.get("params").toString()));
		} catch (IOException e) {
			LOG.error(e);
		}
      //queryRunner.runQuery(session, parseMessage(json.get("params").toString()));
      break;
      
    case "EXPORT":
      String jsonText;
      try {
        jsonText = CSVExporter.export((JSONObject) this.parser.parse(json.get("params").toString()));
        session.getAsyncRemote().sendText(jsonText);
      } catch (ParseException e) {
    	LOG.error(e);
        e.printStackTrace();
      }
      break;
      
    case "CREATE COMMENT":
    	commentRunner.save(parseMessage(json.get("params").toString()));
    	break;
    	
    case "DELETE COMMENT":
    	commentRunner.delete(parseMessage(json.get("params").toString()));
    	break;
    	
    case "DELETE ALERT":
    	alertRunner.delete(parseMessage(json.get("params").toString()));
    	break;
    }
  }
}
