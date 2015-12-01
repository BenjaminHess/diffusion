package com.bah.c4s.crowsnest.action.alert;

import org.json.simple.JSONObject;

import com.bah.c4s.crowsnest.action.ActionResponse;

public class GenericAlert extends Alert{

	public GenericAlert(JSONObject actionDefinition) throws Exception{
		super(actionDefinition);
	}
	
	@Override
	public ActionResponse process(JSONObject json, String dataSource) {
		return this.type;
	}

	@Override
	public String getEntity() {
		// TODO Auto-generated method stub
		return null;
	}

	@Override
	public String getEntityDescription() {
		// TODO Auto-generated method stub
		return null;
	}
}
